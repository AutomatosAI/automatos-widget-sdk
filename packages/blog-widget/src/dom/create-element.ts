/**
 * Terse DOM creation helper. Usage:
 *   h('div', { class: 'foo', onclick: handler }, [child1, 'text'])
 */
export function h(
  tag: string,
  attrs?: Record<string, unknown> | null,
  children?: (Node | string)[],
): HTMLElement {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key === 'class' && typeof value === 'string') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object' && value) {
        Object.assign(el.style, value);
      } else if (key === 'dataset' && typeof value === 'object' && value) {
        Object.assign(el.dataset, value);
      } else if (typeof value === 'string') {
        el.setAttribute(key, value);
      } else if (typeof value === 'boolean' && value) {
        el.setAttribute(key, '');
      }
    }
  }

  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child) {
        el.appendChild(child);
      }
    }
  }

  return el;
}
