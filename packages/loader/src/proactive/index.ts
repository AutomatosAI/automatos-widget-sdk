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
} from '@automatos/core';

import { fetchWidgetConfig } from './config-fetcher';
import { fetchProactiveOpener } from './fetch-opener';
import { resolvePageContext } from './page-context';
import { ProactiveEngine } from './proactive-engine';
import { ProactivePopup } from './proactive-popup';
import { resolveProactiveConfig } from './resolve-config';

const DEFAULT_BASE_URL = 'https://api.automatos.app';
const MOUNT_NODE_SELECTOR = '[data-automatos-widget="chat"]';

export interface FetchOpenerContext {
  baseUrl: string;
  apiKey: string;
  agentId?: string;
}

export type OpenerFetcher = (
  pageContext: PageContext,
  ctx: FetchOpenerContext,
) => Promise<string | null>;

export interface BootstrapProactiveOptions {
  config: AutomatosConfig;
  /** Hooks for chat widget integration (open + send seed message) */
  onOpenChat: (seedMessage?: string) => void;
  /** Override the default opener fetcher (e.g. for tests). */
  fetchOpener?: OpenerFetcher;
  /** Override for tests */
  fetchImpl?: typeof fetch;
  /** Override for tests */
  doc?: Document;
}

const defaultOpenerFetcher: OpenerFetcher = (pageContext, ctx) =>
  fetchProactiveOpener({
    baseUrl: ctx.baseUrl,
    apiKey: ctx.apiKey,
    agentId: ctx.agentId,
    pageContext,
  });

interface ProactiveHandle {
  dispose(): void;
}

const NOOP_HANDLE: ProactiveHandle = { dispose: () => {} };

export async function bootstrapProactive(
  opts: BootstrapProactiveOptions,
): Promise<ProactiveHandle> {
  const { config, onOpenChat } = opts;

  // 1. Resolve effective config: theme override OR workspace config can flip on.
  //    Theme override fields (seconds, message) win over workspace values.
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const override = config.proactiveOverride;

  const payload = await fetchWidgetConfig({
    baseUrl,
    apiKey: config.apiKey,
    fetchImpl: opts.fetchImpl,
  });

  const proactive = resolveProactiveConfig({
    workspaceConfig: payload?.widget_proactive,
    override,
  });

  console.log(
    `[automatos.proactive] resolved config: enabled=${proactive.enabled}, page_types=[${proactive.page_types.join(',')}], delay=${proactive.triggers[0]?.seconds ?? '?'}s, freq=${proactive.frequency_cap.scope}/${proactive.frequency_cap.max_pops}`,
  );

  if (!proactive.enabled) {
    console.log('[automatos.proactive] disabled — set ON in theme or workspace to activate');
    return NOOP_HANDLE;
  }

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

      // Canned text is already visible. Now fire the agent opener in the
      // background and swap when it arrives. If the shopper dismisses
      // before the opener returns, popup.isMounted() guards the update.
      if (proactive.greeting_source !== 'canned') {
        const opener = opts.fetchOpener ?? defaultOpenerFetcher;
        const started = Date.now();
        console.log('[automatos.proactive] fetching contextual opener...');
        opener(pageContext, {
          baseUrl,
          apiKey: config.apiKey,
          agentId: config.agentId,
        })
          .then((text) => {
            const ms = Date.now() - started;
            if (text && popup.isMounted()) {
              console.log(`[automatos.proactive] opener received (${ms}ms): "${text}"`);
              popup.updateText(text);
            } else if (!text) {
              console.warn(
                `[automatos.proactive] opener returned null (${ms}ms) — canned stays. Check POST /api/widgets/chat in Network tab.`,
              );
            } else {
              console.log(
                `[automatos.proactive] opener returned (${ms}ms) but popup already dismissed.`,
              );
            }
          })
          .catch((err) => {
            console.warn('[automatos.proactive] opener fetch threw:', err);
          });
      }

      void reason;
    },
  });
  const armed = engine.start();
  if (!armed) return NOOP_HANDLE;

  return {
    dispose: () => engine.dispose(),
  };
}
