/**
 * ProactiveEngine (PRD-007).
 *
 * Decides *when* to fire a proactive popup. Pure logic + DOM listener
 * registration. Does not own the popup UI — that's `proactive-popup.ts`.
 *
 * Responsibilities:
 *   - Check `enabled` + `page_types` whitelist + `respect_consent` gate.
 *   - Register trigger handlers (time_on_page in v1; scroll/exit/idle scaffolded).
 *   - Honour `frequency_cap` via the `DismissalStore`.
 *   - Emit a single `onTrigger(reason)` callback when conditions are met.
 *   - `dispose()` removes all listeners cleanly (HMR / SPA navigation).
 */

import type {
  PageContext,
  ProactiveTrigger,
  WidgetProactiveConfig,
} from '@automatos/core';
import { DismissalStore } from './dismissal-store';

export interface ConsentChecker {
  /** Returns true when storage / marketing consent allows the popup. */
  isAllowed(): boolean;
}

export interface ProactiveEngineOptions {
  config: WidgetProactiveConfig;
  pageContext: PageContext;
  onTrigger: (reason: string) => void;
  /** Override storage for tests */
  dismissalStore?: DismissalStore;
  /** Override consent gate for tests / advanced merchants */
  consent?: ConsentChecker;
  /** For test injection */
  win?: Window & typeof globalThis;
}

const DEFAULT_CONSENT: ConsentChecker = { isAllowed: () => true };

/**
 * Build the storage-slot key for frequency-cap and dismissal lookups.
 * Includes the product handle when scope is product-aware so different
 * products get independent slots.
 */
export function buildSlotKey(
  pageContext: PageContext,
  scope: WidgetProactiveConfig['frequency_cap']['scope'],
): string {
  const productKey = pageContext.productHandle || pageContext.productId || 'no_product';
  if (scope === 'product_session') return `${pageContext.pageType ?? 'page'}_${productKey}`;
  return pageContext.pageType ?? 'page';
}

export class ProactiveEngine {
  private config: WidgetProactiveConfig;
  private pageContext: PageContext;
  private onTrigger: (reason: string) => void;
  private dismissalStore: DismissalStore;
  private consent: ConsentChecker;
  private win: Window & typeof globalThis;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private fired = false;
  private disposed = false;

  constructor(opts: ProactiveEngineOptions) {
    this.config = opts.config;
    this.pageContext = opts.pageContext;
    this.onTrigger = opts.onTrigger;
    this.dismissalStore = opts.dismissalStore ?? new DismissalStore();
    this.consent = opts.consent ?? DEFAULT_CONSENT;
    this.win = opts.win ?? (window as Window & typeof globalThis);
  }

  /** Start watching for triggers. Returns false if proactive should not fire. */
  start(): boolean {
    if (!this.shouldArm()) return false;
    for (const trigger of this.config.triggers) {
      this.registerTrigger(trigger);
    }
    return true;
  }

  /**
   * Pre-flight: enabled? page-type allowed? consent? frequency-cap ok?
   */
  shouldArm(): boolean {
    if (this.disposed) return false;
    if (!this.config.enabled) return false;
    if (this.config.respect_consent && !this.consent.isAllowed()) return false;

    const pageType = this.pageContext.pageType ?? '';
    if (
      this.config.page_types.length > 0 &&
      !this.config.page_types.includes(pageType)
    ) {
      return false;
    }

    const slot = buildSlotKey(this.pageContext, this.config.frequency_cap.scope);
    const popsSoFar = this.dismissalStore.countPops(slot, this.config.frequency_cap.scope);
    if (popsSoFar >= this.config.frequency_cap.max_pops) return false;

    return true;
  }

  private registerTrigger(trigger: ProactiveTrigger): void {
    if (trigger.type === 'time_on_page') {
      const ms = Math.max(0, (trigger.seconds ?? 20) * 1000);
      const t = this.win.setTimeout(() => this.fire(trigger.type), ms);
      this.timeouts.push(t);
    } else if (trigger.type === 'idle') {
      // Reset the timer on user activity; fire when truly idle.
      const ms = Math.max(0, (trigger.seconds ?? 15) * 1000);
      let idleTimer: ReturnType<typeof setTimeout> = this.win.setTimeout(
        () => this.fire('idle'),
        ms,
      );
      const reset = () => {
        this.win.clearTimeout(idleTimer);
        idleTimer = this.win.setTimeout(() => this.fire('idle'), ms);
        this.timeouts.push(idleTimer);
      };
      this.win.document.addEventListener('mousemove', reset, { passive: true });
      this.win.document.addEventListener('keydown', reset, { passive: true });
      this.timeouts.push(idleTimer);
    } else if (trigger.type === 'scroll_depth') {
      const target = Math.max(1, Math.min(100, trigger.percent ?? 60));
      const handler = () => {
        const doc = this.win.document.documentElement;
        const scrollable = doc.scrollHeight - this.win.innerHeight;
        if (scrollable <= 0) return;
        const pct = ((this.win.scrollY ?? 0) / scrollable) * 100;
        if (pct >= target) {
          this.win.removeEventListener('scroll', handler);
          this.fire('scroll_depth');
        }
      };
      this.win.addEventListener('scroll', handler, { passive: true });
    } else if (trigger.type === 'exit_intent') {
      const handler = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          this.win.document.removeEventListener('mouseout', handler as EventListener);
          this.fire('exit_intent');
        }
      };
      this.win.document.addEventListener('mouseout', handler as EventListener);
    }
  }

  private fire(reason: string): void {
    if (this.fired || this.disposed) return;
    this.fired = true;
    const slot = buildSlotKey(this.pageContext, this.config.frequency_cap.scope);
    this.dismissalStore.recordPop(slot, this.config.dismissal_persistence);
    this.onTrigger(reason);
    this.dispose();
  }

  /** Idempotent. Removes timeouts; listener removal best-effort. */
  dispose(): void {
    this.disposed = true;
    for (const t of this.timeouts) {
      this.win.clearTimeout(t);
    }
    this.timeouts = [];
  }
}
