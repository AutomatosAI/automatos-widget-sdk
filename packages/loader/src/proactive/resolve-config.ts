/**
 * Resolves the effective WidgetProactiveConfig from two sources:
 *
 *   1. Theme-side override (Shopify Liquid block checkbox/inputs)
 *   2. Workspace-side config (from GET /api/widgets/config)
 *
 * Semantics: "enabled" is OR — either source flipping it on fires the
 * popup. The theme override wins on its own scalar fields (seconds,
 * message) when provided, otherwise workspace values, otherwise sane
 * v1 defaults from PRD-007.
 *
 * Pure function — no I/O, easy to unit test.
 */

import type {
  ProactiveOverride,
  WidgetProactiveConfig,
} from '@automatos/core';

const HARDCODED_DEFAULTS: WidgetProactiveConfig = {
  enabled: false,
  page_types: ['product'],
  triggers: [{ type: 'time_on_page', seconds: 20 }],
  frequency_cap: { scope: 'session', max_pops: 1 },
  greeting_source: 'agent_with_canned_fallback',
  canned_fallback: 'Need a hand finding the right product?',
  agent_timeout_ms: 1500,
  popup_style: 'corner_bubble',
  respect_consent: true,
  dismissal_persistence: 'session',
};

export interface ResolveProactiveConfigInput {
  /** From GET /api/widgets/config — may be undefined if endpoint unavailable */
  workspaceConfig?: WidgetProactiveConfig;
  /** From the theme-block checkbox/inputs */
  override?: ProactiveOverride;
}

export function resolveProactiveConfig(
  input: ResolveProactiveConfigInput,
): WidgetProactiveConfig {
  const base: WidgetProactiveConfig = input.workspaceConfig
    ? { ...HARDCODED_DEFAULTS, ...input.workspaceConfig }
    : { ...HARDCODED_DEFAULTS };

  const override = input.override;
  if (!override) return base;

  // enabled is OR — either source can flip it on
  const enabled = override.enabled === true || base.enabled === true;

  // seconds overrides the FIRST time_on_page trigger
  let triggers = base.triggers;
  if (override.seconds !== undefined && override.seconds > 0) {
    triggers = triggers.length > 0
      ? triggers.map((t, i) =>
          i === 0 && t.type === 'time_on_page'
            ? { ...t, seconds: override.seconds }
            : t,
        )
      : [{ type: 'time_on_page', seconds: override.seconds }];
    // If no time_on_page trigger existed at all, prepend one
    if (!triggers.some((t) => t.type === 'time_on_page')) {
      triggers = [{ type: 'time_on_page', seconds: override.seconds }, ...triggers];
    }
  }

  const canned_fallback =
    override.message && override.message.length > 0
      ? override.message
      : base.canned_fallback;

  return {
    ...base,
    enabled,
    triggers,
    canned_fallback,
  };
}
