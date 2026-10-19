import { AI_ARIA_LABELS, type AIDisclosure } from '@automatos/core';
import { h } from '../dom/create-element';
import { createHeader, type Header } from './header';
import { AINotice } from './ai-notice';

export interface ChatPanelOptions {
  onClose: () => void;
  title?: string;
  /** PRD-264 EUAI-02b: the AI notice shown in the header and as the opening turn. */
  disclosure: AIDisclosure;
}

export class ChatPanel {
  readonly el: HTMLElement;
  readonly messagesContainer: HTMLElement;
  readonly inputArea: HTMLElement;
  private header: Header;
  private notice: AINotice;

  constructor(opts: ChatPanelOptions) {
    this.header = createHeader({
      onClose: opts.onClose,
      title: opts.title,
      disclosure: opts.disclosure,
    });

    // PRD-264 EUAI-02b: the notice is the opening turn, so it is in the
    // scrollback before any message (and before the greeting).
    this.notice = new AINotice(opts.disclosure);
    this.messagesContainer = h('div', {
      class: 'aw-messages',
      role: 'log',
      'aria-live': 'polite',
      'aria-label': 'Chat messages',
    }, [this.notice.el]);

    this.inputArea = h('div', { class: 'aw-input-area' });

    const powered = h('div', { class: 'aw-powered' }, [
      'Powered by ',
      h('a', {
        href: 'https://automatos.app',
        target: '_blank',
        rel: 'noopener noreferrer',
      }, ['Automatos AI']),
    ]);

    this.el = h('div', {
      class: 'aw-panel',
      'data-state': 'closed',
      role: 'dialog',
      'aria-label': AI_ARIA_LABELS.panel,
    }, [
      this.header.el,
      this.messagesContainer,
      this.inputArea,
      powered,
    ]);
  }

  /** Show a new AI notice (the server's) in the header badge and the opening turn. */
  setDisclosure(disclosure: AIDisclosure): void {
    this.header.setDisclosure(disclosure);
    this.notice.update(disclosure);
  }

  show(): void {
    this.el.setAttribute('data-state', 'open');
  }

  hide(): void {
    this.el.setAttribute('data-state', 'closed');
  }

  get isOpen(): boolean {
    return this.el.getAttribute('data-state') === 'open';
  }
}
