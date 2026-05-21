/**
 * CartIdleEngine (PRD-008-A Feature C1).
 *
 * Fires a single popup after the shopper has been idle on the cart
 * page for `idle_seconds` without progressing. Completely separate
 * from the product-page ProactiveEngine — different config block,
 * different page-type gate — but shares the DismissalStore for
 * frequency-cap behaviour.
 *
 * Idle reset happens on mousemove / keydown (matching ProactiveEngine
 * 'idle' trigger conventions).
 */

import type {
  PageContext,
  WidgetCartIdleConfig,
} from '@automatos/core';
import { DismissalStore } from '../proactive/dismissal-store';

export interface CartIdleConsentChecker {
  isAllowed(): boolean;
}

export interface CartIdleEngineOptions {
  config: WidgetCartIdleConfig;
  pageContext: PageContext;
  onTrigger: (greeting: string) => void;
  /** Override storage for tests */
  dismissalStore?: DismissalStore;
  /** Override consent gate for tests */
  consent?: CartIdleConsentChecker;
  /** Test injection */
  win?: Window & typeof globalThis;
}

const DEFAULT_CONSENT: CartIdleConsentChecker = { isAllowed: () => true };
const SLOT_PREFIX = 'cart_idle';

export class CartIdleEngine {
  private config: WidgetCartIdleConfig;
  private pageContext: PageContext;
  private onTrigger: (greeting: string) => void;
  private dismissalStore: DismissalStore;
  private consent: CartIdleConsentChecker;
  private win: Window & typeof globalThis;

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private resetHandlers: Array<() => void> = [];
  private fired = false;
  private disposed = false;

  constructor(opts: CartIdleEngineOptions) {
    this.config = opts.config;
    this.pageContext = opts.pageContext;
    this.onTrigger = opts.onTrigger;
    this.dismissalStore = opts.dismissalStore ?? new DismissalStore();
    this.consent = opts.consent ?? DEFAULT_CONSENT;
    this.win = opts.win ?? (window as Window & typeof globalThis);
  }

  start(): boolean {
    const block = this.shouldArmReason();
    if (block !== null) {
      console.log(`[automatos.cart_idle] not armed: ${block}`);
      return false;
    }
    console.log(
      `[automatos.cart_idle] armed — idle_seconds=${this.config.idle_seconds}, freq=${this.config.frequency_cap.scope}/${this.config.frequency_cap.max_pops}`,
    );
    this.scheduleIdleTimer();
    this.attachResetListeners();
    return true;
  }

  shouldArm(): boolean {
    return this.shouldArmReason() === null;
  }

  /** Returns null when arming is OK, else a human-readable reason. */
  private shouldArmReason(): string | null {
    if (this.disposed) return 'engine disposed';
    if (!this.config.enabled) return 'enabled=false';
    if (!this.consent.isAllowed()) return 'consent declined';

    // Cart-idle only fires on the cart page. PRD-008-A spec: the
    // capability gate is enforced server-side (won't ship cart_idle
    // config to non-cart-capable Sites), but defending here keeps
    // the engine self-contained.
    const pageType = this.pageContext.pageType ?? '';
    if (pageType !== 'cart') {
      return `not on cart page (pageType="${pageType}")`;
    }

    const slot = this.slotKey();
    const popsSoFar = this.dismissalStore.countPops(slot, this.config.frequency_cap.scope);
    if (popsSoFar >= this.config.frequency_cap.max_pops) {
      return `frequency cap reached (${popsSoFar}/${this.config.frequency_cap.max_pops})`;
    }

    return null;
  }

  private slotKey(): string {
    // Per-cart-session slot: cart contents change rarely within a
    // session, but the prefix isolates this from the proactive engine's
    // slot space so flipping one doesn't affect the other.
    return `${SLOT_PREFIX}_${this.pageContext.cartItemCount ?? 0}`;
  }

  private scheduleIdleTimer(): void {
    const ms = Math.max(0, this.config.idle_seconds * 1000);
    if (this.idleTimer !== null) this.win.clearTimeout(this.idleTimer);
    this.idleTimer = this.win.setTimeout(() => this.fire(), ms);
  }

  private attachResetListeners(): void {
    const reset = () => {
      if (this.fired || this.disposed) return;
      this.scheduleIdleTimer();
    };
    const detachMM = (() => {
      this.win.document.addEventListener('mousemove', reset, { passive: true });
      return () => this.win.document.removeEventListener('mousemove', reset);
    })();
    const detachKD = (() => {
      this.win.document.addEventListener('keydown', reset, { passive: true });
      return () => this.win.document.removeEventListener('keydown', reset);
    })();
    this.resetHandlers.push(detachMM, detachKD);
  }

  private fire(): void {
    if (this.fired || this.disposed) return;
    this.fired = true;
    const slot = this.slotKey();
    // Map frequency-cap scope → dismissal-persistence scope. Cart isn't
    // product-scoped, so 'product_session' falls through to plain 'session'.
    const persistence = this.config.frequency_cap.scope === 'day' ? 'day' : 'session';
    this.dismissalStore.recordPop(slot, persistence);
    console.log(
      `[automatos.cart_idle] firing — slot=${slot}, persistence=${persistence}`,
    );
    this.onTrigger(this.config.greeting);
    this.dispose();
  }

  /** Idempotent. Cleans up timeouts + reset listeners. */
  dispose(): void {
    this.disposed = true;
    if (this.idleTimer !== null) {
      this.win.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    for (const detach of this.resetHandlers) {
      try {
        detach();
      } catch {
        // best-effort
      }
    }
    this.resetHandlers = [];
  }
}
