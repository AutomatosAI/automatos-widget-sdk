import {
  AutomatosClient,
  DEFAULT_AI_DISCLOSURE,
  resolveAIDisclosure,
  type AutomatosConfig,
  type WidgetMessage,
} from '@automatos/core';
import { createShadowHost } from './dom/shadow-host';
import { FAB } from './components/fab';
import { ChatPanel } from './components/chat-panel';
import { MessageList } from './components/message-list';
import { InputArea } from './components/input-area';
import {
  createInlineCallbackForm,
  type InlineCallbackFormOptions,
} from './components/inline-callback-form';
import { baseCSS } from './styles/base';
import { componentCSS } from './styles/components';
import { animationCSS } from './styles/animations';
import { aiNoticeCSS } from './styles/ai-notice';

/** Public keys authenticate on each request; others exchange for a session first. */
const PUBLIC_KEY_PREFIX = 'ak_pub_';
/** Message id of the deployer's greeting, rendered after the AI notice. */
const GREETING_MESSAGE_ID = 'aw_greeting';

export class ChatWidget {
  private client: AutomatosClient;
  private config: AutomatosConfig;
  private host!: HTMLElement;
  private shadow!: ShadowRoot;
  private fab!: FAB;
  private panel!: ChatPanel;
  private messageList!: MessageList;
  private inputArea!: InputArea;
  private typingEl: HTMLElement | null = null;
  private isStreaming = false;
  private unsubs: (() => void)[] = [];

  constructor(config: AutomatosConfig) {
    this.config = config;
    this.client = new AutomatosClient(config);
    this.mount();
    this.wireEvents();
    this.start();
  }

  // ── Public API ──

  /**
   * Event bus exposed so external code (e.g. the loader's callback module)
   * can listen for chat lifecycle events without reaching into private state.
   * Added in PRD-008-A.2 for the open-callback-form subscription.
   */
  get events(): AutomatosClient['events'] {
    return this.client.events;
  }

  open(): void {
    this.panel.show();
    this.fab.setOpen(true);
    this.client.events.emit('widget:open', undefined as never);
    this.inputArea.focus();
    this.trapFocus();
  }

  close(): void {
    this.panel.hide();
    this.fab.setOpen(false);
    this.client.events.emit('widget:close', undefined as never);
    this.releaseFocus();
  }

  toggle(): void {
    if (this.panel.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * PRD-008-A.3: render the callback form as a chat message bubble inside
   * the scrollback (no popup). Opens the chat panel if it's closed so the
   * shopper sees the form. Idempotent — calling again while a previous form
   * is still pending submission is a no-op.
   */
  injectCallbackForm(opts: {
    session_id: string;
    product_context?: string;
    heading?: string;
    onSuccess?: InlineCallbackFormOptions['onSuccess'];
  }): boolean {
    if (!this.panel.isOpen) {
      this.open();
    }
    const formEl = createInlineCallbackForm({
      baseUrl: this.config.baseUrl ?? 'https://api.automatos.app',
      apiKey: this.config.apiKey,
      session_id: opts.session_id,
      product_context: opts.product_context,
      heading: opts.heading,
      primaryColor: this.config.themeOverrides?.['--aw-primary'],
      onSuccess: opts.onSuccess,
    });
    this.messageList.appendCustomBubble(formEl);
    return true;
  }

  destroy(): void {
    this.client.destroy();
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.host.remove();
  }

  // ── Private ──

  private mount(): void {
    const css = [baseCSS, componentCSS, animationCSS, aiNoticeCSS].join('\n');
    const { host, shadow, container } = createShadowHost(this.config, css);
    this.host = host;
    this.shadow = shadow;

    this.fab = new FAB({ onClick: () => this.toggle() });
    // PRD-264 EUAI-02b: labelled from the first paint with the English
    // default; the server's notice replaces it when the config arrives.
    this.panel = new ChatPanel({
      onClose: () => this.close(),
      title: this.config.title,
      disclosure: resolveAIDisclosure(DEFAULT_AI_DISCLOSURE),
    });
    this.messageList = new MessageList(this.panel.messagesContainer);
    this.renderGreeting();

    this.inputArea = new InputArea({
      onSend: (text) => this.handleSend(text),
    });

    // Replace the placeholder input area with real one
    this.panel.inputArea.replaceWith(this.inputArea.el);

    container.appendChild(this.panel.el);
    container.appendChild(this.fab.el);

    this.client.events.emit('widget:ready', undefined as never);
  }

  /** The deployer's greeting, if set, as the first turn after the AI notice. */
  private renderGreeting(): void {
    const greeting = this.config.greeting?.trim();
    if (!greeting) return;
    this.messageList.addMessage({
      id: GREETING_MESSAGE_ID,
      role: 'assistant',
      content: greeting,
      timestamp: Date.now(),
      status: 'complete',
    });
  }

  /**
   * Pre-authenticate server keys, then load the server's AI notice
   * (PRD-264 EUAI-02b). Run in that order so a server key exchanges for a
   * session once, not twice.
   */
  private start(): void {
    const ready = this.config.apiKey.startsWith(PUBLIC_KEY_PREFIX)
      ? Promise.resolve()
      : this.client.authenticate().catch((err: unknown) => {
          console.warn('[automatos] pre-authentication failed; retrying on first message', err);
        });
    void ready.then(() => this.loadDisclosure());
  }

  /** Show the server's AI notice; an old server without one keeps the English default. */
  private async loadDisclosure(): Promise<void> {
    try {
      const payload = await this.client.getWidgetConfig();
      this.panel.setDisclosure(resolveAIDisclosure(payload.ai_disclosure));
    } catch (err) {
      console.warn('[automatos] widget config unavailable; showing the default AI notice', err);
    }
  }

  private wireEvents(): void {
    const { events } = this.client;

    // PRD-264 EUAI-02b: the stream's first event is the server's notice.
    this.unsubs.push(
      events.on('chat:ai-disclosure', (disclosure) => {
        this.panel.setDisclosure(disclosure);
      }),
    );

    this.unsubs.push(
      events.on('chat:chunk', ({ messageId, fullContent }) => {
        this.messageList.updateStreamingMessage(messageId, fullContent);
      }),
    );

    this.unsubs.push(
      events.on('chat:done', ({ messageId }) => {
        this.isStreaming = false;
        this.removeTyping();
        this.messageList.finalizeMessage(messageId);
        this.inputArea.setDisabled(false);
        this.inputArea.focus();
      }),
    );

    this.unsubs.push(
      events.on('chat:error', ({ messageId, error }) => {
        this.isStreaming = false;
        this.removeTyping();
        this.messageList.markError(messageId, error.message);
        this.inputArea.setDisabled(false);
        this.inputArea.focus();
      }),
    );
  }

  private async handleSend(text: string): Promise<void> {
    if (this.isStreaming) return;

    this.isStreaming = true;
    this.inputArea.setDisabled(true);

    // Add user message to UI
    const userMsg: WidgetMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'complete',
    };
    this.messageList.addMessage(userMsg);

    // Show typing indicator
    this.showTyping();

    // Send to API (streaming — events fire during this await)
    await this.client.sendMessage(text);
  }

  private showTyping(): void {
    this.typingEl = this.messageList.showTyping();
  }

  private removeTyping(): void {
    if (this.typingEl) {
      this.messageList.removeTyping(this.typingEl);
      this.typingEl = null;
    }
  }

  // ── Focus trap for accessibility ──

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  private trapFocus(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = this.shadow.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && this.shadow.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && this.shadow.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    this.shadow.addEventListener('keydown', this.keydownHandler as EventListener);
  }

  private releaseFocus(): void {
    if (this.keydownHandler) {
      this.shadow.removeEventListener('keydown', this.keydownHandler as EventListener);
      this.keydownHandler = null;
    }
  }
}
