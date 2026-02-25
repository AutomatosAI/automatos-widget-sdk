import type { WidgetMessage, ChatMessage } from './types';

let counter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${++counter}`;
}

/**
 * Manages message state for a chat conversation.
 */
export class ConversationManager {
  private messages: WidgetMessage[] = [];
  conversationId: string | null = null;

  getMessages(): readonly WidgetMessage[] {
    return this.messages;
  }

  addUserMessage(content: string): WidgetMessage {
    const msg: WidgetMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'sending',
    };
    this.messages.push(msg);
    return msg;
  }

  addAssistantPlaceholder(): WidgetMessage {
    const msg: WidgetMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
    };
    this.messages.push(msg);
    return msg;
  }

  addGreeting(content: string): WidgetMessage {
    const msg: WidgetMessage = {
      id: generateId(),
      role: 'assistant',
      content,
      timestamp: Date.now(),
      status: 'complete',
    };
    this.messages.push(msg);
    return msg;
  }

  appendChunk(messageId: string, chunk: string): string {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.content += chunk;
      return msg.content;
    }
    return '';
  }

  finalizeMessage(messageId: string): void {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.status = 'complete';
    }
  }

  markSent(messageId: string): void {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.status = 'complete';
    }
  }

  markError(messageId: string, errorContent?: string): void {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.status = 'error';
      if (errorContent) msg.content = errorContent;
    }
  }

  /**
   * Load history from backend into state.
   */
  loadHistory(history: ChatMessage[]): void {
    this.messages = history.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.created_at).getTime(),
      status: 'complete' as const,
    }));
  }

  clear(): void {
    this.messages = [];
    this.conversationId = null;
  }
}
