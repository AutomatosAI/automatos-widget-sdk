import {
  AutomatosClient,
  type AutomatosConfig,
  type WidgetMessage,
} from '@automatos/core';
import { createShadowHost } from './dom/shadow-host';
import { FAB } from './components/fab';
import { ChatPanel } from './components/chat-panel';
import { MessageList } from './components/message-list';
import { InputArea } from './components/input-area';
import { baseCSS } from './styles/base';
import { componentCSS } from './styles/components';
import { animationCSS } from './styles/animations';

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

    // Pre-authenticate for server keys
    if (!config.apiKey.startsWith('ak_pub_')) {
      this.client.authenticate().catch(() => {
        // Will retry on first message
      });
    }
  }

  // ── Public API ──

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

  destroy(): void {
    this.client.destroy();
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.host.remove();
  }

  // ── Private ──

  private mount(): void {
    const css = [baseCSS, componentCSS, animationCSS].join('\n');
    const { host, shadow, container } = createShadowHost(this.config, css);
    this.host = host;
    this.shadow = shadow;

    this.fab = new FAB({ onClick: () => this.toggle() });
    this.panel = new ChatPanel({ onClose: () => this.close(), title: this.config.title });
    this.messageList = new MessageList(this.panel.messagesContainer);

    this.inputArea = new InputArea({
      onSend: (text) => this.handleSend(text),
    });

    // Replace the placeholder input area with real one
    this.panel.inputArea.replaceWith(this.inputArea.el);

    container.appendChild(this.panel.el);
    container.appendChild(this.fab.el);

    this.client.events.emit('widget:ready', undefined as never);
  }

  private wireEvents(): void {
    const { events } = this.client;

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
