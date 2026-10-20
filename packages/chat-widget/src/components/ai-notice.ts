/**
 * The AI notice (PRD-264 EUAI-02b, EU AI Act Art. 50(1) and 50(5)).
 *
 * Two pieces, both fed from one `AIDisclosure`:
 * - the badge, a fixed locale term (`AI`, `IA`, `KI`) shown beside the
 *   header title for the whole session; the deployer's `title` never
 *   replaces it (D17);
 * - the opening turn, the notice line rendered before the first message.
 *
 * Their colours are literal values in `styles/ai-notice.ts`, not theme
 * variables, so a `themeOverrides` colour can't hide them.
 */

import { aiAssistantLabel, type AIDisclosure } from '@automatos/core';
import { h } from '../dom/create-element';

/** Hook the tests and host pages use to find the notice, whatever the theme. */
export const AI_BADGE_ATTR = 'data-ai-badge';
export const AI_NOTICE_ATTR = 'data-ai-notice';

/** A badge element showing `disclosure.badge`; `title` spells out "AI assistant". */
export function createAIBadge(disclosure: AIDisclosure, extraClass = ''): HTMLElement {
  const badge = h('span', {
    class: `aw-ai-badge${extraClass ? ` ${extraClass}` : ''}`,
    [AI_BADGE_ATTR]: 'true',
  });
  setBadge(badge, disclosure);
  return badge;
}

/** Point an existing badge at a new notice (the server's, once it arrives). */
export function setBadge(badge: HTMLElement, disclosure: AIDisclosure): void {
  badge.textContent = disclosure.badge;
  badge.setAttribute('title', aiAssistantLabel(disclosure));
  badge.setAttribute('lang', disclosure.locale);
}

/** The opening turn: the notice line, always the first thing in the scrollback. */
export class AINotice {
  readonly el: HTMLElement;
  private readonly badgeEl: HTMLElement;
  private readonly lineEl: HTMLElement;

  constructor(disclosure: AIDisclosure) {
    // The header badge already names the AI for screen readers; this copy
    // is visual, and the line itself says it in words.
    this.badgeEl = createAIBadge(disclosure, 'aw-ai-notice-badge');
    this.badgeEl.setAttribute('aria-hidden', 'true');
    this.lineEl = h('span', { class: 'aw-ai-notice-line' });
    this.el = h('div', {
      class: 'aw-ai-notice',
      role: 'note',
      [AI_NOTICE_ATTR]: 'true',
    }, [this.badgeEl, this.lineEl]);
    this.update(disclosure);
  }

  update(disclosure: AIDisclosure): void {
    setBadge(this.badgeEl, disclosure);
    this.lineEl.textContent = disclosure.line;
    this.el.setAttribute('lang', disclosure.locale);
  }
}
