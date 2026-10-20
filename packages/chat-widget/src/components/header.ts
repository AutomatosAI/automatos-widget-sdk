import { AI_ARIA_LABELS, type AIDisclosure } from '@automatos/core';
import { h } from '../dom/create-element';
import { icons } from '../dom/icons';
import { createAIBadge, setBadge } from './ai-notice';

/** Header title when the deployer sets none. */
export const DEFAULT_HEADER_TITLE = 'Automatos AI';

export interface HeaderOptions {
  onClose: () => void;
  title?: string;
  /** PRD-264 EUAI-02b: the AI notice whose badge sits beside the title. */
  disclosure: AIDisclosure;
}

export interface Header {
  readonly el: HTMLElement;
  /** Swap in a new notice (the server's); the badge stays, only its term changes. */
  setDisclosure(disclosure: AIDisclosure): void;
}

/**
 * The panel header: logo, title, the AI badge and the close button.
 * The deployer's `title` changes the title text only; the badge is a
 * separate element no option removes (PRD-264 D17).
 */
export function createHeader(opts: HeaderOptions): Header {
  const title = opts.title || DEFAULT_HEADER_TITLE;
  const logoLetter = title.charAt(0).toUpperCase();
  const badge = createAIBadge(opts.disclosure, 'aw-header-badge');

  const el = h('div', { class: 'aw-header' }, [
    h('div', { class: 'aw-header-logo', 'aria-hidden': 'true' }, [logoLetter]),
    badge,
    h('span', { class: 'aw-header-title' }, [title]),
    h('button', {
      class: 'aw-header-close',
      'aria-label': AI_ARIA_LABELS.closeChat,
      onClick: () => opts.onClose(),
    }, [icons.close()]),
  ]);

  return {
    el,
    setDisclosure: (disclosure) => setBadge(badge, disclosure),
  };
}
