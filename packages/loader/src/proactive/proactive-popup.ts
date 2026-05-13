/**
 * ProactivePopup (PRD-007).
 *
 * Shadow DOM popup component. Self-contained: own styles, no theme leakage,
 * dismissable. Renders in `corner_bubble` (default) or `slide_in_card` style.
 */

import type { ProactivePopupStyle } from '@automatos/core';

export interface ProactivePopupOptions {
  text: string;
  style?: ProactivePopupStyle;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  onClick?: () => void;
  onDismiss?: () => void;
  doc?: Document;
}

const STYLES_BASE = `
  :host {
    position: fixed;
    z-index: 2147483646;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --aw-popup-bg: #ffffff;
    --aw-popup-text: #1a1a1a;
    --aw-popup-border: rgba(0,0,0,0.08);
    --aw-popup-shadow: 0 10px 32px rgba(0,0,0,0.12);
    --aw-popup-radius: 14px;
    --aw-popup-accent: #6366f1;
  }
  :host([data-position="bottom-right"]) { right: 24px; bottom: 96px; }
  :host([data-position="bottom-left"]) { left: 24px; bottom: 96px; }
  .container {
    background: var(--aw-popup-bg);
    color: var(--aw-popup-text);
    border: 1px solid var(--aw-popup-border);
    border-radius: var(--aw-popup-radius);
    box-shadow: var(--aw-popup-shadow);
    padding: 14px 16px 12px 16px;
    max-width: 320px;
    line-height: 1.4;
    font-size: 14px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    animation: aw-pop-in 220ms ease-out;
  }
  .text { flex: 1; }
  .close {
    background: none;
    border: none;
    color: rgba(0,0,0,0.4);
    cursor: pointer;
    padding: 0;
    margin: -2px -4px 0 0;
    font-size: 18px;
    line-height: 1;
  }
  .close:hover { color: rgba(0,0,0,0.7); }
  @keyframes aw-pop-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  :host([data-style="slide_in_card"]) .container {
    max-width: 360px;
    padding: 16px 20px;
    animation: aw-slide-in 280ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }
  @keyframes aw-slide-in {
    from { opacity: 0; transform: translateX(24px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

export class ProactivePopup {
  private host: HTMLElement;
  private shadow: ShadowRoot | null = null;
  private opts: Required<Pick<ProactivePopupOptions, 'style' | 'position'>> &
    ProactivePopupOptions;
  private mounted = false;
  private doc: Document;

  constructor(opts: ProactivePopupOptions) {
    this.doc = opts.doc ?? document;
    this.opts = {
      style: opts.style ?? 'corner_bubble',
      position: opts.position ?? 'bottom-right',
      ...opts,
    };
    this.host = this.doc.createElement('aw-proactive-popup');
    this.host.setAttribute('data-position', this.opts.position);
    this.host.setAttribute('data-style', this.opts.style);
  }

  mount(parent: ParentNode = this.doc.body): void {
    if (this.mounted) return;
    this.shadow = this.host.attachShadow({ mode: 'open' });
    const shadow = this.shadow;

    const styleEl = this.doc.createElement('style');
    let css = STYLES_BASE;
    if (this.opts.primaryColor) {
      css += `\n:host { --aw-popup-accent: ${this.opts.primaryColor}; }`;
    }
    styleEl.textContent = css;

    const container = this.doc.createElement('div');
    container.className = 'container';

    const text = this.doc.createElement('div');
    text.className = 'text';
    text.textContent = this.opts.text;

    const close = this.doc.createElement('button');
    close.className = 'close';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×'; // ×

    container.appendChild(text);
    container.appendChild(close);

    container.addEventListener('click', (e) => {
      if (e.target === close) return;
      this.opts.onClick?.();
      this.unmount();
    });
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      this.opts.onDismiss?.();
      this.unmount();
    });

    shadow.appendChild(styleEl);
    shadow.appendChild(container);
    parent.appendChild(this.host);
    this.mounted = true;
  }

  /** Replace the popup text in place (used when LLM opener arrives after canned). */
  updateText(text: string): void {
    this.opts.text = text;
    if (!this.mounted || !this.shadow) return;
    const textEl = this.shadow.querySelector('.text');
    if (textEl) textEl.textContent = text;
  }

  unmount(): void {
    if (!this.mounted) return;
    this.host.parentNode?.removeChild(this.host);
    this.mounted = false;
    this.shadow = null;
  }

  isMounted(): boolean {
    return this.mounted;
  }
}
