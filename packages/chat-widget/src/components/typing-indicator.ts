/**
 * Creates a typing indicator element (3-dot bounce).
 */
export function createTypingIndicator(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'aw-typing';
  el.setAttribute('aria-label', 'Assistant is typing');

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'aw-typing-dot';
    el.appendChild(dot);
  }

  return el;
}
