/**
 * Cart-idle bootstrap (PRD-008-A Feature C1 + PRD-008-B Feature C2).
 *
 * Mirrors the proactive bootstrap in shape: pulls the public widget
 * config, checks the cart_idle block, instantiates a CartIdleEngine.
 *
 * PRD-008-B Feature C2 — when the engine fires, the popup is mounted
 * immediately with the merchant's configured `cart_idle.greeting`
 * (canned fallback). In the background we POST to the orchestrator
 * with trigger_reason=cart_idle and the cart pageContext (including
 * line items). When the agent returns a graph-grounded greeting we
 * swap it into the still-mounted popup. Same canned-then-swap pattern
 * as the product-page proactive opener.
 */

import type { AutomatosConfig } from '@automatos/core';

import { fetchWidgetConfig } from '../proactive/config-fetcher';
import { fetchProactiveOpener } from '../proactive/fetch-opener';
import { resolvePageContext } from '../proactive/page-context';
import { ProactivePopup } from '../proactive/proactive-popup';

import { CartIdleEngine } from './cart-idle-engine';

const DEFAULT_BASE_URL = 'https://api.automatos.app';
const MOUNT_NODE_SELECTOR = '[data-automatos-widget="chat"]';

export interface BootstrapCartIdleOptions {
  config: AutomatosConfig;
  /** Hook into chat widget — open with the greeting pre-loaded. */
  onOpenChat: (seedMessage?: string) => void;
  /** Override for tests */
  fetchImpl?: typeof fetch;
  /** Override for tests */
  doc?: Document;
}

interface CartIdleHandle {
  dispose(): void;
}

const NOOP_HANDLE: CartIdleHandle = { dispose: () => {} };

export async function bootstrapCartIdle(
  opts: BootstrapCartIdleOptions,
): Promise<CartIdleHandle> {
  const { config, onOpenChat } = opts;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  let payload;
  try {
    payload = await fetchWidgetConfig({
      baseUrl,
      apiKey: config.apiKey,
      fetchImpl: opts.fetchImpl,
    });
  } catch (err) {
    console.warn('[automatos.cart_idle] config fetch failed', err);
    return NOOP_HANDLE;
  }

  const cartIdle = payload?.cart_idle;
  if (!cartIdle || !cartIdle.enabled) {
    // Silent: most Sites won't have this on. Don't pollute logs.
    return NOOP_HANDLE;
  }

  const doc = opts.doc ?? document;
  const mountNode = doc.querySelector(MOUNT_NODE_SELECTOR);
  const pageContext = resolvePageContext({
    config,
    mountNode,
    doc,
  });

  // Cheap exit: not on cart page → nothing to do.
  if ((pageContext.pageType ?? '') !== 'cart') {
    return NOOP_HANDLE;
  }

  const engine = new CartIdleEngine({
    config: cartIdle,
    pageContext,
    onTrigger: (greeting) => {
      // Track the latest greeting we have — the popup shows canned first,
      // then swaps in the AI text. When the shopper clicks, send the most
      // recent text as the seed message so the chat opens with the same
      // line they just saw.
      let currentGreeting = greeting;
      const popup = new ProactivePopup({
        text: greeting,
        style: 'corner_bubble',
        position: config.position ?? 'bottom-right',
        primaryColor: config.themeOverrides?.['--aw-primary'],
        doc,
        onClick: () => onOpenChat(currentGreeting),
        onDismiss: () => {
          // Frequency cap already recorded by engine.fire; no-op here.
        },
      });
      popup.mount();

      // PRD-008-B Feature C2: fetch a graph-grounded greeting in the
      // background and swap in when ready. The canned greeting stays on
      // failure / timeout — degrades gracefully like the product-page
      // opener.
      const started = Date.now();
      console.log('[automatos.cart_idle] fetching graph-grounded greeting...');
      fetchProactiveOpener({
        baseUrl,
        apiKey: config.apiKey,
        agentId: config.agentId,
        pageContext,
        triggerReason: 'cart_idle',
        fetchImpl: opts.fetchImpl,
      })
        .then((text) => {
          const ms = Date.now() - started;
          if (text && popup.isMounted()) {
            console.log(`[automatos.cart_idle] greeting received (${ms}ms): "${text}"`);
            currentGreeting = text;
            popup.updateText(text);
          } else if (!text) {
            console.warn(
              `[automatos.cart_idle] greeting returned null (${ms}ms) — canned stays.`,
            );
          } else {
            console.log(
              `[automatos.cart_idle] greeting returned (${ms}ms) but popup already dismissed.`,
            );
          }
        })
        .catch((err) => {
          console.warn('[automatos.cart_idle] greeting fetch threw:', err);
        });
    },
  });

  const armed = engine.start();
  if (!armed) return NOOP_HANDLE;

  return {
    dispose: () => engine.dispose(),
  };
}
