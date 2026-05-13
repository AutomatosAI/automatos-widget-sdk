/**
 * Frequency-cap + dismissal persistence for proactive popups (PRD-007).
 *
 * `session` scope → sessionStorage (cleared on tab close)
 * `day` scope → localStorage with a date stamp
 * `until_navigation` → in-memory only (no persistence; gone on next nav)
 */

import type { ProactiveDismissalScope, ProactiveFrequencyScope } from '@automatos/core';

const KEY_PREFIX = '__aw_proactive_';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface DismissalStoreOptions {
  storage?: { session: StorageLike; local: StorageLike };
  now?: () => Date;
}

function safeGetStorage(): { session: StorageLike; local: StorageLike } | null {
  if (typeof window === 'undefined') return null;
  try {
    return { session: window.sessionStorage, local: window.localStorage };
  } catch {
    return null;
  }
}

function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export class DismissalStore {
  private inMemory: Map<string, string> = new Map();
  private storage: { session: StorageLike; local: StorageLike } | null;
  private now: () => Date;

  constructor(opts: DismissalStoreOptions = {}) {
    this.storage = opts.storage ?? safeGetStorage();
    this.now = opts.now ?? (() => new Date());
  }

  private resolveStorage(scope: ProactiveDismissalScope): StorageLike | null {
    if (!this.storage) return null;
    if (scope === 'session') return this.storage.session;
    if (scope === 'day') return this.storage.local;
    return null; // until_navigation — in-memory only
  }

  private buildKey(slot: string, scope: ProactiveDismissalScope): string {
    if (scope === 'day') return `${KEY_PREFIX}${slot}_day_${todayKey(this.now())}`;
    return `${KEY_PREFIX}${slot}_${scope}`;
  }

  /** Mark a slot dismissed/seen for the configured scope. */
  recordPop(slot: string, scope: ProactiveDismissalScope): void {
    const key = this.buildKey(slot, scope);
    const storage = this.resolveStorage(scope);
    const value = String(this.now().getTime());
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch {
        // Fall through to in-memory if storage write fails (private mode etc.)
      }
    }
    this.inMemory.set(key, value);
  }

  /** True if the slot has already been popped/dismissed for the scope. */
  hasPopped(slot: string, scope: ProactiveDismissalScope): boolean {
    const key = this.buildKey(slot, scope);
    const storage = this.resolveStorage(scope);
    if (storage) {
      try {
        if (storage.getItem(key) !== null) return true;
      } catch {
        // Fall through
      }
    }
    return this.inMemory.has(key);
  }

  /** Clear the slot's dismissal record across both storages. */
  reset(slot: string, scope: ProactiveDismissalScope): void {
    const key = this.buildKey(slot, scope);
    const storage = this.resolveStorage(scope);
    storage?.removeItem(key);
    this.inMemory.delete(key);
  }

  /** Frequency-cap helper: count of pops in the slot under the scope. */
  countPops(slot: string, scope: ProactiveFrequencyScope): number {
    // Map frequency scope onto dismissal scope for storage lookup.
    const dScope: ProactiveDismissalScope =
      scope === 'day' ? 'day' : 'session';
    return this.hasPopped(slot, dScope) ? 1 : 0;
  }
}
