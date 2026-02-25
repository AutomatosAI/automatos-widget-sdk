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
      host.style.setProperty(prop, value);
    }
  }

  document.body.appendChild(host);

  return { host, shadow, container };
}
