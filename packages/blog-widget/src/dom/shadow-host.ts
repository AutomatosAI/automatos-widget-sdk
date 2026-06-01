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

  // Merchant-configurable desktop grid columns. Custom properties inherit
  // through the shadow boundary, so setting it on the host drives the grid
  // CSS (`repeat(var(--aw-blog-columns, 3), 1fr)`). Clamp to a sane range.
  const cols = config.blogConfig?.columns;
  if (typeof cols === 'number' && Number.isFinite(cols)) {
    const clamped = Math.min(6, Math.max(1, Math.round(cols)));
    host.style.setProperty('--aw-blog-columns', String(clamped));
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
