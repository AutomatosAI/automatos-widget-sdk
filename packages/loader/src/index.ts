import type { AutomatosConfig } from '@automatos/core';
import { ChatWidget } from '@automatos/chat-widget';
import { BlogWidget } from '@automatos/blog-widget';
import { bootstrapProactive } from './proactive';
import { bootstrapCartIdle } from './cart-idle';
import {
  openCallbackForm as openCallbackFormImpl,
  rememberCallbackContext,
  resetCallbackContext,
  type OpenCallbackFormOptions,
} from './callback';

let chatInstance: ChatWidget | null = null;
let blogInstance: BlogWidget | null = null;
let proactiveHandle: { dispose: () => void } | null = null;
let cartIdleHandle: { dispose: () => void } | null = null;

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
    return;
  }

  if (chatInstance) {
    console.warn('[automatos] Chat widget already initialized. Call destroy() first.');
    return;
  }
  chatInstance = new ChatWidget(config);

  // PRD-008-A B: stash config so openCallbackForm() can be called from
  // anywhere (chat-widget intent classifier, popups, merchant code).
  rememberCallbackContext(config);

  // PRD-007: spin up proactive engagement asynchronously. Failures are
  // swallowed inside bootstrapProactive — chat keeps working regardless.
  bootstrapProactive({
    config,
    onOpenChat: () => chatInstance?.open(),
  })
    .then((handle) => {
      proactiveHandle = handle;
    })
    .catch((err) => {
      console.warn('[automatos] proactive bootstrap failed', err);
    });

  // PRD-008-A C1: cart-idle proactive (only fires on /cart pages of
  // Sites with cart_idle.enabled). Independent of widget_proactive —
  // a Site can have one, both, or neither.
  bootstrapCartIdle({
    config,
    // Greeting is rendered in the popup itself; clicking the popup
    // just opens the chat. Seed-message wiring through ChatWidget
    // lives in Phase 8 (callback form integration).
    onOpenChat: () => chatInstance?.open(),
  })
    .then((handle) => {
      cartIdleHandle = handle;
    })
    .catch((err) => {
      console.warn('[automatos] cart-idle bootstrap failed', err);
    });
}

/**
 * Destroy the current widget instance.
 */
export function destroy(): void {
  proactiveHandle?.dispose();
  proactiveHandle = null;
  cartIdleHandle?.dispose();
  cartIdleHandle = null;
  resetCallbackContext();
  chatInstance?.destroy();
  chatInstance = null;
  blogInstance?.destroy();
  blogInstance = null;
}

/**
 * Open the phone-capture callback form (PRD-008-A Feature B).
 * Returns true if the form opened, false if it was suppressed
 * (already open, init not called, etc.).
 */
export function openCallbackForm(opts: OpenCallbackFormOptions = {}): boolean {
  return openCallbackFormImpl(opts);
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
      openCallbackForm: typeof openCallbackForm;
    };
  };

  const queue = win.AutomatosWidget?.q;

  win.AutomatosWidget = { init, destroy, open, close, toggle, openCallbackForm };

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
