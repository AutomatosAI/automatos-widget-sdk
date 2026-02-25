import { h } from '../dom/create-element';
import { icons } from '../dom/icons';

export interface HeaderOptions {
  onClose: () => void;
}

export function createHeader(opts: HeaderOptions): HTMLElement {
  return h('div', { class: 'aw-header' }, [
    h('div', { class: 'aw-header-logo' }, ['A']),
    h('span', { class: 'aw-header-title' }, ['Automatos AI']),
    h('button', {
      class: 'aw-header-close',
      'aria-label': 'Close chat',
      onClick: () => opts.onClose(),
    }, [icons.close()]),
  ]);
}
