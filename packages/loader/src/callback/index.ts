/**
 * Callback feature bootstrap (PRD-008-A Feature B).
 *
 * Exposes ``openCallbackForm()`` on the global ``AutomatosWidget``
 * object. Any caller — chat-widget intent classifier, the proactive
 * popup, the cart-idle popup, or merchant code — can trigger the
 * phone-capture form without knowing about the underlying network
 * contract.
 */

import type { AutomatosConfig } from '@automatos/core';

import { CallbackForm } from './callback-form';

const DEFAULT_BASE_URL = 'https://api.automatos.app';

export interface OpenCallbackFormOptions {
  /** Pre-fill the product context that flows to the merchant's destination. */
  product_context?: string;
  /** Override the form heading (e.g. for a merchant-specific brand voice). */
  heading?: string;
  /** Called on successful submit. */
  onSuccess?: (result: { request_id: string; eta_phrase: string }) => void;
  /** Called when the form is dismissed. */
  onDismiss?: () => void;
}

let activeForm: CallbackForm | null = null;
let storedConfig: AutomatosConfig | null = null;
let storedSessionId: string | null = null;


/**
 * Stash the resolved config so subsequent ``openCallbackForm`` calls
 * have everything they need without re-passing it. Called by the
 * loader's ``init()``.
 */
export function rememberCallbackContext(config: AutomatosConfig): void {
  storedConfig = config;
  // Lazily generate a session_id so the merchant doesn't have to. The
  // chat-widget already manages its own session — we use the same
  // value if present, fall back to a random one.
  if (!storedSessionId) {
    storedSessionId = readChatSessionIdOr(generateSessionId());
  }
}


/**
 * Mount the callback form. Returns true if the form opened, false
 * if it was suppressed (already open, or context not initialised).
 */
export function openCallbackForm(opts: OpenCallbackFormOptions = {}): boolean {
  if (activeForm && activeForm.isMounted()) {
    // Already open — surface to console so the caller knows.
    console.warn('[automatos.callback] form already open — ignoring');
    return false;
  }
  if (!storedConfig || !storedSessionId) {
    console.warn(
      '[automatos.callback] openCallbackForm called before init() — config not stashed',
    );
    return false;
  }

  const baseUrl = storedConfig.baseUrl ?? DEFAULT_BASE_URL;

  activeForm = new CallbackForm({
    baseUrl,
    apiKey: storedConfig.apiKey,
    session_id: storedSessionId,
    product_context: opts.product_context ?? storedConfig.pageContext?.productTitle,
    heading: opts.heading,
    primaryColor: storedConfig.themeOverrides?.['--aw-primary'],
    onSuccess: (result) => {
      console.log(
        `[automatos.callback] submitted request_id=${result.request_id}`,
      );
      opts.onSuccess?.(result);
    },
    onDismiss: () => {
      activeForm = null;
      opts.onDismiss?.();
    },
  });
  activeForm.mount();
  return true;
}


/** Test/HMR hook — drop the singleton so re-init starts clean. */
export function resetCallbackContext(): void {
  if (activeForm?.isMounted()) activeForm.unmount();
  activeForm = null;
  storedConfig = null;
  storedSessionId = null;
}


// ---------------------------------------------------------------------------
// Internal — session_id resolution
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = '__aw_widget_session_id';

function readChatSessionIdOr(fallback: string): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, fallback);
    return fallback;
  } catch {
    return fallback;
  }
}

function generateSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `widget_${ts}_${rand}`;
}
