import { h } from '../dom/create-element';
import { icons } from '../dom/icons';

export interface HeaderOptions {
  onClose: () => void;
  title?: string;
}

export function createHeader(opts: HeaderOptions): HTMLElement {
  const title = opts.title || 'Automatos AI';
  const logoLetter = title.charAt(0).toUpperCase();

  return h('div', { class: 'aw-header' }, [
    h('div', { class: 'aw-header-logo' }, [logoLetter]),
    h('span', { class: 'aw-header-title' }, [title]),
    h('button', {
      class: 'aw-header-close',
      'aria-label': 'Close chat',
      onClick: () => opts.onClose(),
    }, [icons.close()]),
  ]);
}
