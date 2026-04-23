import type {
  AutomatosConfig,
  BlogPost,
  BlogPostListResponse,
  ChatMessage,
  ChatRequest,
  SSEEvent,
  WidgetEvents,
  WidgetMessage,
} from './types';
import { EventBus } from './event-bus';
import { AuthManager } from './auth';
import { ConversationManager } from './conversation';
import { parseSSEStream } from './sse-parser';
import { AuthError, NetworkError } from './errors';

const DEFAULT_BASE_URL = 'https://api.automatos.app';

export class AutomatosClient {
  readonly events = new EventBus<WidgetEvents>();
  readonly conversation = new ConversationManager();
  private auth: AuthManager;
  private baseUrl: string;
  private config: AutomatosConfig;
  private abortController: AbortController | null = null;

  constructor(config: AutomatosConfig) {
    this.config = config;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.auth = new AuthManager(this.baseUrl, config.apiKey);
  }

  /**
   * Authenticate with the backend. Required for server keys;
   * public keys authenticate on each request.
   */
  async authenticate(): Promise<void> {
    if (!this.auth.isPublicKey) {
      try {
        const session = await this.auth.authenticate();
        this.events.emit('auth:success', { workspaceId: session.workspace_id });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.events.emit('auth:error', error);
        throw err;
      }
    }
  }

  /**
   * Send a message and stream the response.
   * Returns the user message and assistant placeholder.
   */
  async sendMessage(content: string): Promise<{
    userMessage: WidgetMessage;
    assistantMessage: WidgetMessage;
  }> {
    const userMessage = this.conversation.addUserMessage(content);
    this.events.emit('chat:message', userMessage);
    this.conversation.markSent(userMessage.id);

    const assistantMessage = this.conversation.addAssistantPlaceholder();
    this.events.emit('chat:message', assistantMessage);

    // Start streaming
    this.abortController = new AbortController();

    try {
      const body: ChatRequest = {
        message: content,
        conversation_id: this.conversation.conversationId ?? undefined,
        agent_id: this.config.agentId,
        model_id: this.config.modelId,
      };

      const authHeader = await this.auth.getAuthHeader();
      const res = await fetch(`${this.baseUrl}/api/widgets/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        await this.handleErrorResponse(res, assistantMessage.id);
        return { userMessage, assistantMessage };
      }

      if (!res.body) {
        throw new NetworkError('No response body', res.status);
      }

      // Parse SSE stream
      for await (const event of parseSSEStream(res.body, this.abortController.signal)) {
        this.handleSSEEvent(event, assistantMessage.id);
      }

      // If stream ends without a done event, finalize anyway
      if (this.conversation.getMessages().find((m) => m.id === assistantMessage.id)?.status === 'streaming') {
        this.conversation.finalizeMessage(assistantMessage.id);
        this.events.emit('chat:done', {
          messageId: assistantMessage.id,
          conversationId: this.conversation.conversationId ?? '',
        });
      }
    } catch (err) {
      if (this.abortController?.signal.aborted) return { userMessage, assistantMessage };

      const error = err instanceof Error ? err : new Error(String(err));
      this.conversation.markError(assistantMessage.id);
      this.events.emit('chat:error', { messageId: assistantMessage.id, error });
    } finally {
      this.abortController = null;
    }

    return { userMessage, assistantMessage };
  }

  /**
   * Fetch conversation history from the backend.
   */
  async getHistory(conversationId: string): Promise<ChatMessage[]> {
    const authHeader = await this.auth.getAuthHeader();
    const res = await fetch(`${this.baseUrl}/api/widgets/chat/${conversationId}`, {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      throw new NetworkError('Failed to fetch history', res.status);
    }

    const messages: ChatMessage[] = await res.json();
    this.conversation.conversationId = conversationId;
    this.conversation.loadHistory(messages);
    return messages;
  }

  // ── Blog API ──

  async listPosts(options?: {
    page?: number;
    perPage?: number;
    category?: string;
    tag?: string;
  }): Promise<BlogPostListResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.perPage) params.set('per_page', String(options.perPage));
    if (options?.category) params.set('category', options.category);
    if (options?.tag) params.set('tag', options.tag);

    const authHeader = await this.auth.getAuthHeader();
    const qs = params.toString();
    const res = await fetch(
      `${this.baseUrl}/api/widgets/blog/posts${qs ? `?${qs}` : ''}`,
      { headers: { Authorization: authHeader } },
    );

    if (!res.ok) {
      throw new NetworkError('Failed to fetch posts', res.status);
    }

    return res.json();
  }

  async getPost(slug: string): Promise<BlogPost> {
    const authHeader = await this.auth.getAuthHeader();
    const res = await fetch(
      `${this.baseUrl}/api/widgets/blog/posts/${encodeURIComponent(slug)}`,
      { headers: { Authorization: authHeader } },
    );

    if (!res.ok) {
      throw new NetworkError('Failed to fetch post', res.status);
    }

    return res.json();
  }

  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    const authHeader = await this.auth.getAuthHeader();
    const res = await fetch(`${this.baseUrl}/api/widgets/blog/categories`, {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      throw new NetworkError('Failed to fetch categories', res.status);
    }

    return res.json();
  }

  async getTags(): Promise<Array<{ tag: string; count: number }>> {
    const authHeader = await this.auth.getAuthHeader();
    const res = await fetch(`${this.baseUrl}/api/widgets/blog/tags`, {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      throw new NetworkError('Failed to fetch tags', res.status);
    }

    return res.json();
  }

  /**
   * Abort the current streaming request.
   */
  abort(): void {
    this.abortController?.abort();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.abort();
    this.auth.destroy();
    this.conversation.clear();
    this.events.removeAll();
  }

  private handleSSEEvent(event: SSEEvent, assistantMessageId: string): void {
    switch (event.event) {
      case 'message': {
        const content = (event.data.content as string) ?? '';
        const fullContent = this.conversation.appendChunk(assistantMessageId, content);
        this.events.emit('chat:chunk', {
          messageId: assistantMessageId,
          content,
          fullContent,
        });
        break;
      }
      case 'tool-start':
        this.events.emit('chat:tool-start', {
          tool: event.data.tool as string,
          arguments: event.data.arguments as Record<string, unknown> | undefined,
        });
        break;
      case 'tool-end':
        this.events.emit('chat:tool-end', {
          tool: event.data.tool as string,
          result: event.data.result,
        });
        break;
      case 'done': {
        const conversationId = event.data.conversation_id as string;
        this.conversation.conversationId = conversationId;
        this.conversation.finalizeMessage(assistantMessageId);
        this.events.emit('chat:done', {
          messageId: assistantMessageId,
          conversationId,
        });
        break;
      }
      case 'error': {
        const message = (event.data.message as string) ?? 'Unknown error';
        this.conversation.markError(assistantMessageId, message);
        this.events.emit('chat:error', {
          messageId: assistantMessageId,
          error: new Error(message),
        });
        break;
      }
    }
  }

  private async handleErrorResponse(res: Response, messageId: string): Promise<void> {
    const text = await res.text().catch(() => '');

    if (res.status === 401 || res.status === 403) {
      // Try re-auth once
      try {
        await this.authenticate();
      } catch {
        // Re-auth failed
      }
      const error = new AuthError(text || 'Authentication failed');
      this.conversation.markError(messageId, 'Authentication failed. Please refresh the page.');
      this.events.emit('chat:error', { messageId, error });
      return;
    }

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
      const error = new NetworkError('Rate limited', 429, retryAfter);
      this.conversation.markError(messageId, `Too many requests. Please wait ${retryAfter} seconds.`);
      this.events.emit('chat:error', { messageId, error });
      return;
    }

    const error = new NetworkError(text || `Request failed (${res.status})`, res.status);
    this.conversation.markError(messageId, 'Something went wrong. Please try again.');
    this.events.emit('chat:error', { messageId, error });
  }
}
