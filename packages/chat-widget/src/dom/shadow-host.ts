import type { AutomatosConfig } from '@automatos/core';

/**
 * Creates a Shadow DOM host element with style isolation.
 */
export function createShadowHost(
  config: AutomatosConfig,
  css: string,
): { host: HTMLElement; shadow: ShadowRoot; container: HTMLElement } {
  const host = document.createElement('div');
  host.id = 'automatos-widget';
  host.setAttribute('data-theme', config.theme ?? 'light');
  host.setAttribute('data-position', config.position ?? 'bottom-right');

  // Inline styles on the host element itself. We intentionally bypass the
  // shadow CSS here because:
  //   1. `:host { all: initial }` inside the shadow resets display to inline
  //   2. Host-level `position: fixed` is needed so a transformed ancestor in
  //      the embedding page cannot trap our fixed descendants in a
  //      containing block (common in Shopify themes, CMS editors, etc.)
  //   3. Inline styles have higher precedence than any external theme CSS
  //      except !important — and since the host is inside the page's light
  //      DOM, theme CSS can target `#automatos-widget` and hide it.
  const pos = config.position ?? 'bottom-right';
  host.style.setProperty('position', 'fixed', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  host.style.setProperty('display', 'block', 'important');
  host.style.setProperty('visibility', 'visible', 'important');
  host.style.setProperty('opacity', '1', 'important');
  host.style.setProperty('pointer-events', 'none', 'important');
  host.style.setProperty('width', '0', 'important');
  host.style.setProperty('height', '0', 'important');
  if (pos === 'bottom-right') {
    host.style.setProperty('bottom', '20px', 'important');
    host.style.setProperty('right', '20px', 'important');
  } else if (pos === 'bottom-left') {
    host.style.setProperty('bottom', '20px', 'important');
    host.style.setProperty('left', '20px', 'important');
  }

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  // Container for widget content
  const container = document.createElement('div');
  container.className = 'aw-root';
  shadow.appendChild(container);

  // Apply theme overrides via CSS custom properties
  if (config.themeOverrides) {
    for (const [prop, value] of Object.entries(config.themeOverrides)) {
      host.style.setProperty(prop, value, 'important');
    }
  }

  document.body.appendChild(host);

  return { host, shadow, container };
}
