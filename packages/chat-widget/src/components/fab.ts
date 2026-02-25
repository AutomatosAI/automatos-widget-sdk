import { h } from '../dom/create-element';
import { icons } from '../dom/icons';

export interface FABOptions {
  onClick: () => void;
}

export class FAB {
  readonly el: HTMLElement;
  private badge: HTMLElement;
  private isOpen = false;

  constructor(opts: FABOptions) {
    this.badge = h('span', { class: 'aw-fab-badge' });

    this.el = h('button', {
      class: 'aw-fab',
      'aria-label': 'Open chat',
      'data-open': 'false',
      onClick: () => opts.onClick(),
    }, [
      icons.chat(),
      icons.close(),
      this.badge,
    ]);
  }

  setOpen(open: boolean): void {
    this.isOpen = open;
    this.el.setAttribute('data-open', String(open));
    this.el.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) this.hideBadge();
  }

  showBadge(): void {
    if (!this.isOpen) {
      this.badge.classList.add('visible');
    }
  }

  hideBadge(): void {
    this.badge.classList.remove('visible');
  }
}
