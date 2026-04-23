import type { AutomatosConfig } from '@automatos/core';
import { ChatWidget } from '@automatos/chat-widget';
import { BlogWidget } from '@automatos/blog-widget';

let chatInstance: ChatWidget | null = null;
let blogInstance: BlogWidget | null = null;

/**
 * Initialize the Automatos widget.
 */
export function init(config: AutomatosConfig): void {
  if (config.widget === 'blog') {
    if (blogInstance) {
      console.warn('[automatos] Blog widget already initialized. Call destroy() first.');
      return;
    }
    blogInstance = new BlogWidget(config);
  } else {
    if (chatInstance) {
      console.warn('[automatos] Chat widget already initialized. Call destroy() first.');
      return;
    }
    chatInstance = new ChatWidget(config);
  }
}

/**
 * Destroy the current widget instance.
 */
export function destroy(): void {
  chatInstance?.destroy();
  chatInstance = null;
  blogInstance?.destroy();
  blogInstance = null;
}

/**
 * Open the widget panel (chat only).
 */
export function open(): void {
  if (blogInstance) {
    console.warn('[automatos] open() is not supported for blog widgets.');
    return;
  }
  chatInstance?.open();
}

/**
 * Close the widget panel (chat only).
 */
export function close(): void {
  if (blogInstance) {
    console.warn('[automatos] close() is not supported for blog widgets.');
    return;
  }
  chatInstance?.close();
}

/**
 * Toggle the widget panel open/closed (chat only).
 */
export function toggle(): void {
  if (blogInstance) {
    console.warn('[automatos] toggle() is not supported for blog widgets.');
    return;
  }
  chatInstance?.toggle();
}

// Process queued commands from async script loading
if (typeof window !== 'undefined') {
  const win = window as unknown as {
    AutomatosWidget?: {
      q?: Array<[string, ...unknown[]]>;
      init: typeof init;
      destroy: typeof destroy;
      open: typeof open;
      close: typeof close;
      toggle: typeof toggle;
    };
  };

  const queue = win.AutomatosWidget?.q;

  win.AutomatosWidget = { init, destroy, open, close, toggle };

  // Replay queued commands
  if (Array.isArray(queue)) {
    for (const [method, ...args] of queue) {
      const fn = win.AutomatosWidget[method as keyof typeof win.AutomatosWidget];
      if (typeof fn === 'function') {
        (fn as (...a: unknown[]) => void)(...args);
      }
    }
  }
}
