import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PageContext,
  WidgetCartIdleConfig,
} from '@automatos/core';

import { CartIdleEngine } from '../cart-idle/cart-idle-engine';
import { DismissalStore } from '../proactive/dismissal-store';

const baseConfig = (
  overrides: Partial<WidgetCartIdleConfig> = {},
): WidgetCartIdleConfig => ({
  enabled: true,
  idle_seconds: 1,
  greeting: 'Any questions before you check out?',
  frequency_cap: { scope: 'session', max_pops: 1 },
  ...overrides,
});

const cartContext = (overrides: Partial<PageContext> = {}): PageContext => ({
  pageType: 'cart',
  cartItemCount: 2,
  ...overrides,
});

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

let store: DismissalStore;

beforeEach(() => {
  vi.useFakeTimers();
  const session = new FakeStorage();
  const local = new FakeStorage();
  store = new DismissalStore({
    storage: {
      session: session as unknown as Storage,
      local: local as unknown as Storage,
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Arming gates
// ---------------------------------------------------------------------------

describe('CartIdleEngine arming', () => {
  it('does not arm when disabled', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig({ enabled: false }),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
    });
    expect(engine.start()).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does not arm when consent declined', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig(),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
      consent: { isAllowed: () => false },
    });
    expect(engine.start()).toBe(false);
  });

  it('does not arm when not on a cart page', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig(),
      pageContext: { pageType: 'product' },
      onTrigger,
      dismissalStore: store,
    });
    expect(engine.start()).toBe(false);
  });

  it('does not arm when frequency cap reached', () => {
    const onTrigger = vi.fn();
    const ctx = cartContext();
    // Pre-record a pop in the same slot
    store.recordPop(`cart_idle_${ctx.cartItemCount}`, 'session');

    const engine = new CartIdleEngine({
      config: baseConfig(),
      pageContext: ctx,
      onTrigger,
      dismissalStore: store,
    });
    expect(engine.start()).toBe(false);
  });

  it('arms on cart page with valid config', () => {
    const engine = new CartIdleEngine({
      config: baseConfig(),
      pageContext: cartContext(),
      onTrigger: vi.fn(),
      dismissalStore: store,
    });
    expect(engine.start()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Trigger behaviour
// ---------------------------------------------------------------------------

describe('CartIdleEngine trigger', () => {
  it('fires onTrigger after idle_seconds without activity', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig({ idle_seconds: 1 }),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
    });
    engine.start();
    expect(onTrigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith('Any questions before you check out?');
  });

  it('passes the configured greeting to onTrigger', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig({
        idle_seconds: 1,
        greeting: 'Stuck on delivery options?',
      }),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
    });
    engine.start();
    vi.advanceTimersByTime(1000);
    expect(onTrigger).toHaveBeenCalledWith('Stuck on delivery options?');
  });

  it('resets the idle timer on mousemove', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig({ idle_seconds: 1 }),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
    });
    engine.start();

    vi.advanceTimersByTime(500);
    document.dispatchEvent(new MouseEvent('mousemove'));
    vi.advanceTimersByTime(500);
    // Total elapsed = 1000ms, but the activity reset the timer at 500ms
    expect(onTrigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('resets on keydown', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig({ idle_seconds: 1 }),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
    });
    engine.start();

    vi.advanceTimersByTime(500);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    vi.advanceTimersByTime(900);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('only fires once even with multiple triggers', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig({ idle_seconds: 1 }),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
    });
    engine.start();
    vi.advanceTimersByTime(2000);
    vi.advanceTimersByTime(2000);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('records a pop in DismissalStore on fire (drives frequency cap)', () => {
    const onTrigger = vi.fn();
    const ctx = cartContext();
    const engine = new CartIdleEngine({
      config: baseConfig(),
      pageContext: ctx,
      onTrigger,
      dismissalStore: store,
    });
    engine.start();
    vi.advanceTimersByTime(1000);

    // Re-arming the same engine should now refuse
    const engine2 = new CartIdleEngine({
      config: baseConfig(),
      pageContext: ctx,
      onTrigger: vi.fn(),
      dismissalStore: store,
    });
    expect(engine2.start()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

describe('CartIdleEngine disposal', () => {
  it('does not fire after dispose', () => {
    const onTrigger = vi.fn();
    const engine = new CartIdleEngine({
      config: baseConfig({ idle_seconds: 1 }),
      pageContext: cartContext(),
      onTrigger,
      dismissalStore: store,
    });
    engine.start();
    engine.dispose();
    vi.advanceTimersByTime(2000);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('dispose is idempotent', () => {
    const engine = new CartIdleEngine({
      config: baseConfig(),
      pageContext: cartContext(),
      onTrigger: vi.fn(),
      dismissalStore: store,
    });
    engine.start();
    engine.dispose();
    expect(() => engine.dispose()).not.toThrow();
  });

  it('removes event listeners on dispose', () => {
    const removed: string[] = [];
    const fakeWin = {
      ...window,
      document: {
        addEventListener: () => {},
        removeEventListener: (event: string) => removed.push(event),
      },
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    } as unknown as Window & typeof globalThis;

    const engine = new CartIdleEngine({
      config: baseConfig(),
      pageContext: cartContext(),
      onTrigger: vi.fn(),
      dismissalStore: store,
      win: fakeWin,
    });
    engine.start();
    engine.dispose();
    // Both mousemove + keydown removal attempted
    expect(removed).toEqual(expect.arrayContaining(['mousemove', 'keydown']));
  });
});
