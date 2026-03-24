import type { AutomatosConfig } from '@automatos/core';

/**
 * Creates a Shadow DOM host for the blog widget.
 * Mounts into containerSelector if provided, otherwise appends to body.
 */
export function createBlogShadowHost(
  config: AutomatosConfig,
  css: string,
): { host: HTMLElement; shadow: ShadowRoot; container: HTMLElement } {
  const host = document.createElement('div');
  host.id = 'automatos-blog-widget';
  host.setAttribute('data-theme', config.theme ?? 'light');

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'aw-blog-root';
  shadow.appendChild(container);

  if (config.themeOverrides) {
    for (const [prop, value] of Object.entries(config.themeOverrides)) {
      host.style.setProperty(prop, value, 'important');
    }
  }

  if (config.containerSelector) {
    const target = document.querySelector(config.containerSelector);
    if (target) {
      target.appendChild(host);
    } else {
      console.warn(`[automatos-blog] Container "${config.containerSelector}" not found, appending to body.`);
      document.body.appendChild(host);
    }
  } else {
    document.body.appendChild(host);
  }

  return { host, shadow, container };
}
