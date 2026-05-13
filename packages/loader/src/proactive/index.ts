/**
 * Proactive engagement bootstrap (PRD-007).
 *
 * Wires the engine + popup + page-context reader into the loader init flow.
 * Pure orchestration — all primitives live in sibling files so they can be
 * unit-tested in isolation.
 */

import type {
  AutomatosConfig,
  PageContext,
  WidgetProactiveConfig,
} from '@automatos/core';

import { fetchWidgetConfig } from './config-fetcher';
import { resolvePageContext } from './page-context';
import { ProactiveEngine } from './proactive-engine';
import { ProactivePopup } from './proactive-popup';

const DEFAULT_BASE_URL = 'https://api.automatos.app';
const MOUNT_NODE_SELECTOR = '[data-automatos-widget="chat"]';

export interface BootstrapProactiveOptions {
  config: AutomatosConfig;
  /** Hooks for chat widget integration (open + send seed message) */
  onOpenChat: (seedMessage?: string) => void;
  /** Optional: the agent's contextual opener fetcher (for `agent` greeting source) */
  fetchOpener?: (pageContext: PageContext) => Promise<string | null>;
  /** Override for tests */
  fetchImpl?: typeof fetch;
  /** Override for tests */
  doc?: Document;
}

interface ProactiveHandle {
  dispose(): void;
}

const NOOP_HANDLE: ProactiveHandle = { dispose: () => {} };

export async function bootstrapProactive(
  opts: BootstrapProactiveOptions,
): Promise<ProactiveHandle> {
  const { config, onOpenChat } = opts;

  // 1. Fetch the widget config from the orchestrator.
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const payload = await fetchWidgetConfig({
    baseUrl,
    apiKey: config.apiKey,
    fetchImpl: opts.fetchImpl,
  });
  const proactive: WidgetProactiveConfig | undefined = payload?.widget_proactive;

  if (!proactive || !proactive.enabled) return NOOP_HANDLE;

  // 2. Resolve page context.
  const doc = opts.doc ?? document;
  const mountNode = doc.querySelector(MOUNT_NODE_SELECTOR);
  const pageContext = resolvePageContext({
    config,
    mountNode,
    doc,
  });

  // 3. Spin up the engine.
  const engine = new ProactiveEngine({
    config: proactive,
    pageContext,
    onTrigger: async (reason) => {
      const popup = new ProactivePopup({
        text: proactive.canned_fallback,
        style: proactive.popup_style,
        position: config.position ?? 'bottom-right',
        primaryColor: config.themeOverrides?.['--aw-primary'],
        doc,
        onClick: () => onOpenChat(popup === undefined ? undefined : undefined),
        onDismiss: () => {
          // dismissal already recorded by the engine's onTrigger gate;
          // no further action needed.
        },
      });
      popup.mount();

      // Replace canned with agent text if configured.
      if (
        proactive.greeting_source !== 'canned' &&
        opts.fetchOpener
      ) {
        const timeoutMs = Math.max(0, proactive.agent_timeout_ms ?? 1500);
        const openerPromise = opts.fetchOpener(pageContext);
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), timeoutMs),
        );
        const winner = await Promise.race([openerPromise, timeoutPromise]);
        if (winner && popup.isMounted()) {
          popup.updateText(winner);
        }
      }

      // Wire click handler with the resolved opener as seed message
      // (The popup already calls onOpenChat on container click; we'd need
      //  to re-bind to pass the resolved text. v1 just opens the chat;
      //  follow-up can plumb the opener as a seeded assistant message.)
      void reason;
    },
  });
  const armed = engine.start();
  if (!armed) return NOOP_HANDLE;

  return {
    dispose: () => engine.dispose(),
  };
}
