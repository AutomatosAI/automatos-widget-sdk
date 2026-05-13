import { describe, expect, it } from 'vitest';
import { resolveProactiveConfig } from '../proactive/resolve-config';
import type { WidgetProactiveConfig } from '@automatos/core';

const workspaceOff: WidgetProactiveConfig = {
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

describe('resolveProactiveConfig — defaults', () => {
  it('returns hardcoded defaults (off) when neither source provides config', () => {
    const result = resolveProactiveConfig({});
    expect(result.enabled).toBe(false);
    expect(result.page_types).toEqual(['product']);
    expect(result.triggers).toEqual([{ type: 'time_on_page', seconds: 20 }]);
  });
});

describe('resolveProactiveConfig — workspace only', () => {
  it('passes through workspace.enabled = true', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: { ...workspaceOff, enabled: true },
    });
    expect(result.enabled).toBe(true);
  });

  it('passes through workspace tunables', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: {
        ...workspaceOff,
        enabled: true,
        popup_style: 'slide_in_card',
        canned_fallback: 'Custom workspace text',
      },
    });
    expect(result.popup_style).toBe('slide_in_card');
    expect(result.canned_fallback).toBe('Custom workspace text');
  });
});

describe('resolveProactiveConfig — theme override only', () => {
  it('theme enabled=true flips on even when workspace is off', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: workspaceOff,
      override: { enabled: true },
    });
    expect(result.enabled).toBe(true);
  });

  it('theme enabled=true works with NO workspace config (offline / endpoint down)', () => {
    const result = resolveProactiveConfig({
      override: { enabled: true },
    });
    expect(result.enabled).toBe(true);
    expect(result.page_types).toEqual(['product']);
    expect(result.triggers[0].seconds).toBe(20);
  });

  it('theme seconds override replaces the time_on_page trigger seconds', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: { ...workspaceOff, enabled: true },
      override: { enabled: true, seconds: 45 },
    });
    const tot = result.triggers.find((t) => t.type === 'time_on_page');
    expect(tot?.seconds).toBe(45);
  });

  it('theme message override replaces canned_fallback', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: { ...workspaceOff, enabled: true, canned_fallback: 'ws text' },
      override: { enabled: true, message: 'Theme says hi' },
    });
    expect(result.canned_fallback).toBe('Theme says hi');
  });

  it('empty theme message does NOT override workspace canned_fallback', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: { ...workspaceOff, enabled: true, canned_fallback: 'ws text' },
      override: { enabled: true, message: '' },
    });
    expect(result.canned_fallback).toBe('ws text');
  });

  it('theme seconds = 0 does NOT override (treated as unset)', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: { ...workspaceOff, enabled: true },
      override: { enabled: true, seconds: 0 },
    });
    expect(result.triggers[0].seconds).toBe(20);  // workspace default unchanged
  });
});

describe('resolveProactiveConfig — OR semantics for enabled', () => {
  it('workspace=true + override.enabled=false → still ON (theme cannot force off when workspace says on)', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: { ...workspaceOff, enabled: true },
      override: { enabled: false },
    });
    // Spec choice: OR semantics — workspace can independently enable.
    expect(result.enabled).toBe(true);
  });

  it('workspace=false + override.enabled=true → ON', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: workspaceOff,
      override: { enabled: true },
    });
    expect(result.enabled).toBe(true);
  });

  it('workspace=false + override.enabled=false → OFF', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: workspaceOff,
      override: { enabled: false },
    });
    expect(result.enabled).toBe(false);
  });

  it('workspace=undefined + override undefined → OFF (default)', () => {
    const result = resolveProactiveConfig({});
    expect(result.enabled).toBe(false);
  });
});

describe('resolveProactiveConfig — merge precedence on tunables', () => {
  it('non-overridable fields come from workspace, not override', () => {
    const result = resolveProactiveConfig({
      workspaceConfig: {
        ...workspaceOff,
        enabled: true,
        page_types: ['product', 'collection'],
        popup_style: 'slide_in_card',
        frequency_cap: { scope: 'day', max_pops: 3 },
      },
      override: { enabled: true, seconds: 10, message: 'override text' },
    });
    // overridden
    expect(result.canned_fallback).toBe('override text');
    expect(result.triggers[0].seconds).toBe(10);
    // not overridden — comes from workspace
    expect(result.page_types).toEqual(['product', 'collection']);
    expect(result.popup_style).toBe('slide_in_card');
    expect(result.frequency_cap).toEqual({ scope: 'day', max_pops: 3 });
  });
});
