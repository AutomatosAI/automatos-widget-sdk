import { beforeEach, describe, expect, it } from 'vitest';
import { DismissalStore } from '../proactive/dismissal-store';

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

let session: FakeStorage;
let local: FakeStorage;

beforeEach(() => {
  session = new FakeStorage();
  local = new FakeStorage();
});

const fixedNow = () => new Date('2026-05-13T10:00:00Z');

function makeStore() {
  return new DismissalStore({
    storage: { session, local },
    now: fixedNow,
  });
}

describe('DismissalStore — session scope', () => {
  it('records to session storage', () => {
    const store = makeStore();
    expect(store.hasPopped('product', 'session')).toBe(false);
    store.recordPop('product', 'session');
    expect(store.hasPopped('product', 'session')).toBe(true);
    expect(local.getItem('__aw_proactive_product_session')).toBeNull();
  });

  it('reset clears the slot', () => {
    const store = makeStore();
    store.recordPop('product', 'session');
    store.reset('product', 'session');
    expect(store.hasPopped('product', 'session')).toBe(false);
  });
});

describe('DismissalStore — day scope', () => {
  it('records to local storage with date stamp', () => {
    const store = makeStore();
    store.recordPop('product', 'day');
    expect(store.hasPopped('product', 'day')).toBe(true);
    // Date-stamped key
    const keys = Array.from((local as unknown as { map: Map<string, string> }).map.keys());
    expect(keys[0]).toBe('__aw_proactive_product_day_2026-05-13');
  });
});

describe('DismissalStore — until_navigation scope', () => {
  it('uses in-memory only', () => {
    const store = makeStore();
    store.recordPop('product', 'until_navigation');
    expect(store.hasPopped('product', 'until_navigation')).toBe(true);
    expect(session.getItem('__aw_proactive_product_until_navigation')).toBeNull();
    expect(local.getItem('__aw_proactive_product_until_navigation')).toBeNull();
  });
});

describe('DismissalStore — countPops', () => {
  it('returns 1 when popped, 0 otherwise', () => {
    const store = makeStore();
    expect(store.countPops('product', 'session')).toBe(0);
    store.recordPop('product', 'session');
    expect(store.countPops('product', 'session')).toBe(1);
  });
});

describe('DismissalStore — fallback to in-memory when storage throws', () => {
  it('falls back gracefully', () => {
    const broken: Pick<FakeStorage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: () => {
        throw new Error('quota');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    const store = new DismissalStore({
      storage: { session: broken as unknown as FakeStorage, local },
      now: fixedNow,
    });
    store.recordPop('product', 'session');
    expect(store.hasPopped('product', 'session')).toBe(true);
  });
});
