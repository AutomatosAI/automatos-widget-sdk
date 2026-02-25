import { h } from '../dom/create-element';
import { createHeader } from './header';

export interface ChatPanelOptions {
  onClose: () => void;
}

export class ChatPanel {
  readonly el: HTMLElement;
  readonly messagesContainer: HTMLElement;
  readonly inputArea: HTMLElement;
  private headerEl: HTMLElement;

  constructor(opts: ChatPanelOptions) {
    this.headerEl = createHeader({ onClose: opts.onClose });

    this.messagesContainer = h('div', {
      class: 'aw-messages',
      role: 'log',
      'aria-live': 'polite',
      'aria-label': 'Chat messages',
    });

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
      'aria-label': 'Chat widget',
    }, [
      this.headerEl,
      this.messagesContainer,
      this.inputArea,
      powered,
    ]);
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
