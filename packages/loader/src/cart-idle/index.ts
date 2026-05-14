/**
 * Cart-idle bootstrap (PRD-008-A Feature C1).
 *
 * Mirrors the proactive bootstrap in shape: pulls the public widget
 * config, checks the cart_idle block, instantiates a CartIdleEngine,
 * mounts a ProactivePopup on trigger that opens the chat with the
 * configured greeting as a seed message.
 */

import type { AutomatosConfig } from '@automatos/core';

import { fetchWidgetConfig } from '../proactive/config-fetcher';
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
      const popup = new ProactivePopup({
        text: greeting,
        style: 'corner_bubble',
        position: config.position ?? 'bottom-right',
        primaryColor: config.themeOverrides?.['--aw-primary'],
        doc,
        onClick: () => onOpenChat(greeting),
        onDismiss: () => {
          // Frequency cap already recorded by engine.fire; no-op here.
        },
      });
      popup.mount();
    },
  });

  const armed = engine.start();
  if (!armed) return NOOP_HANDLE;

  return {
    dispose: () => engine.dispose(),
  };
}
