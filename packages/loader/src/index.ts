import type { AutomatosConfig } from '@automatos/core';
import { ChatWidget } from '@automatos/chat-widget';

let instance: ChatWidget | null = null;

/**
 * Initialize the Automatos widget.
 */
export function init(config: AutomatosConfig): void {
  if (instance) {
    console.warn('[automatos] Widget already initialized. Call destroy() first.');
    return;
  }
  instance = new ChatWidget(config);
}

/**
 * Destroy the current widget instance.
 */
export function destroy(): void {
  instance?.destroy();
  instance = null;
}

/**
 * Open the widget panel.
 */
export function open(): void {
  instance?.open();
}

/**
 * Close the widget panel.
 */
export function close(): void {
  instance?.close();
}

/**
 * Toggle the widget panel open/closed.
 */
export function toggle(): void {
  instance?.toggle();
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

  // Replace stub with real implementation
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
