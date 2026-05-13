import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WidgetProactiveConfig } from '@automatos/core';
import {
  ProactiveEngine,
  buildSlotKey,
} from '../proactive/proactive-engine';
import { DismissalStore } from '../proactive/dismissal-store';

const baseConfig = (
  overrides: Partial<WidgetProactiveConfig> = {},
): WidgetProactiveConfig => ({
  enabled: true,
  page_types: ['product'],
  triggers: [{ type: 'time_on_page', seconds: 1 }],
  frequency_cap: { scope: 'session', max_pops: 1 },
  greeting_source: 'agent_with_canned_fallback',
  canned_fallback: 'hi',
  agent_timeout_ms: 1500,
  popup_style: 'corner_bubble',
  respect_consent: false,
  dismissal_persistence: 'session',
  ...overrides,
});

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

function freshStore() {
  return new DismissalStore({
    storage: { session: new FakeStorage(), local: new FakeStorage() },
    now: () => new Date('2026-05-13T10:00:00Z'),
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('buildSlotKey', () => {
  it('returns page type for non-product scopes', () => {
    expect(
      buildSlotKey({ pageType: 'collection' }, 'session'),
    ).toBe('collection');
  });

  it('includes product handle for product_session scope', () => {
    expect(
      buildSlotKey({ pageType: 'product', productHandle: 'fan-pro' }, 'product_session'),
    ).toBe('product_fan-pro');
  });

  it('falls back to product id when handle missing', () => {
    expect(
      buildSlotKey({ pageType: 'product', productId: 999 }, 'product_session'),
    ).toBe('product_999');
  });
});

describe('ProactiveEngine.shouldArm', () => {
  it('returns false when disabled', () => {
    const engine = new ProactiveEngine({
      config: baseConfig({ enabled: false }),
      pageContext: { pageType: 'product' },
      onTrigger: () => {},
      dismissalStore: freshStore(),
    });
    expect(engine.shouldArm()).toBe(false);
  });

  it('returns false when page_types does not include current', () => {
    const engine = new ProactiveEngine({
      config: baseConfig({ page_types: ['product'] }),
      pageContext: { pageType: 'collection' },
      onTrigger: () => {},
      dismissalStore: freshStore(),
    });
    expect(engine.shouldArm()).toBe(false);
  });

  it('returns false when consent declined and respect_consent is true', () => {
    const engine = new ProactiveEngine({
      config: baseConfig({ respect_consent: true }),
      pageContext: { pageType: 'product' },
      onTrigger: () => {},
      dismissalStore: freshStore(),
      consent: { isAllowed: () => false },
    });
    expect(engine.shouldArm()).toBe(false);
  });

  it('returns false when frequency cap already reached', () => {
    const store = freshStore();
    store.recordPop('product', 'session');
    const engine = new ProactiveEngine({
      config: baseConfig({ frequency_cap: { scope: 'session', max_pops: 1 } }),
      pageContext: { pageType: 'product' },
      onTrigger: () => {},
      dismissalStore: store,
    });
    expect(engine.shouldArm()).toBe(false);
  });

  it('returns true when all gates pass', () => {
    const engine = new ProactiveEngine({
      config: baseConfig(),
      pageContext: { pageType: 'product' },
      onTrigger: () => {},
      dismissalStore: freshStore(),
    });
    expect(engine.shouldArm()).toBe(true);
  });
});

describe('ProactiveEngine.start — time_on_page trigger', () => {
  it('fires after the configured delay', () => {
    const onTrigger = vi.fn();
    const engine = new ProactiveEngine({
      config: baseConfig({
        triggers: [{ type: 'time_on_page', seconds: 5 }],
      }),
      pageContext: { pageType: 'product' },
      onTrigger,
      dismissalStore: freshStore(),
    });

    const armed = engine.start();
    expect(armed).toBe(true);
    expect(onTrigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4999);
    expect(onTrigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith('time_on_page');
  });

  it('only fires once even if multiple triggers race', () => {
    const onTrigger = vi.fn();
    const engine = new ProactiveEngine({
      config: baseConfig({
        triggers: [
          { type: 'time_on_page', seconds: 1 },
          { type: 'time_on_page', seconds: 2 },
        ],
      }),
      pageContext: { pageType: 'product' },
      onTrigger,
      dismissalStore: freshStore(),
    });

    engine.start();
    vi.advanceTimersByTime(5000);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not fire after dispose', () => {
    const onTrigger = vi.fn();
    const engine = new ProactiveEngine({
      config: baseConfig({ triggers: [{ type: 'time_on_page', seconds: 1 }] }),
      pageContext: { pageType: 'product' },
      onTrigger,
      dismissalStore: freshStore(),
    });
    engine.start();
    engine.dispose();
    vi.advanceTimersByTime(2000);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('records dismissal on fire to enforce frequency cap', () => {
    const store = freshStore();
    const engine = new ProactiveEngine({
      config: baseConfig({ triggers: [{ type: 'time_on_page', seconds: 1 }] }),
      pageContext: { pageType: 'product' },
      onTrigger: () => {},
      dismissalStore: store,
    });
    engine.start();
    vi.advanceTimersByTime(1000);

    expect(store.hasPopped('product', 'session')).toBe(true);

    // Second engine on same page should not arm
    const second = new ProactiveEngine({
      config: baseConfig(),
      pageContext: { pageType: 'product' },
      onTrigger: () => {},
      dismissalStore: store,
    });
    expect(second.shouldArm()).toBe(false);
  });
});
