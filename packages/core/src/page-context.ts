/**
 * Page-context reader (PRD-007 / PRD-141).
 *
 * Resolves the visitor's current page snapshot from one of:
 *   1. `config.pageContext` passed to `init()` (preferred — host page builds it)
 *   2. `data-*` attributes on a host-supplied selector / element
 *   3. `data-*` attributes on the widget mount node
 *
 * Lives in `core` (not `loader`) so both the proactive engine AND the chat
 * client can resolve the same snapshot — the client forwards it on every
 * regular message, the proactive engine on openers. Vertical-agnostic: the
 * data-attr map is just a key translation, no vertical-specific behaviour.
 *
 * Returns an immutable copy so downstream code can't mutate the source.
 */

import type { PageContext } from './types';

const DATA_ATTR_KEY_MAP: Record<string, keyof PageContext> = {
  'data-page-type': 'pageType',
  'data-page-template': 'template',
  'data-product-id': 'productId',
  'data-product-handle': 'productHandle',
  'data-product-type': 'productType',
  'data-product-vendor': 'productVendor',
  'data-product-title': 'productTitle',
  'data-product-price': 'productPrice',
  'data-product-available': 'productAvailable',
  'data-collection-id': 'collectionId',
  'data-collection-handle': 'collectionHandle',
  'data-collection-title': 'collectionTitle',
  'data-shop-domain': 'shopDomain',
  'data-shop-currency': 'shopCurrency',
  'data-shop-locale': 'shopLocale',
  'data-customer-id': 'customerId',
  'data-customer-tags': 'customerTags',
  'data-cart-item-count': 'cartItemCount',
  'data-cart-total-price': 'cartTotalPrice',
};

const NUMERIC_KEYS: ReadonlySet<keyof PageContext> = new Set<keyof PageContext>([
  'cartItemCount',
]);

const BOOLEAN_KEYS: ReadonlySet<keyof PageContext> = new Set<keyof PageContext>([
  'productAvailable',
]);

function coerceValue(key: keyof PageContext, raw: string): unknown {
  if (raw === '') return undefined;
  if (NUMERIC_KEYS.has(key)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  if (BOOLEAN_KEYS.has(key)) {
    return raw === 'true';
  }
  return raw;
}

export function readPageContextFromElement(el: Element | null | undefined): PageContext {
  if (!el || typeof el.getAttribute !== 'function') return {};
  const ctx: Record<string, unknown> = {};
  for (const attr of Object.keys(DATA_ATTR_KEY_MAP)) {
    const key = DATA_ATTR_KEY_MAP[attr];
    const raw = el.getAttribute(attr);
    if (raw == null) continue;
    const value = coerceValue(key, raw);
    if (value !== undefined && value !== '') {
      ctx[key as string] = value;
    }
  }
  return ctx as PageContext;
}

export interface ResolvePageContextInput {
  config: { pageContext?: PageContext; pageContextElement?: string | HTMLElement };
  /** Fallback: the widget's own mount node (`<div data-automatos-widget="chat">`) */
  mountNode?: Element | null;
  /** Optional: caller-supplied document for tests */
  doc?: Document;
}

/**
 * Resolve the page context using the documented precedence order.
 * Pure function — no DOM mutation, safe to call repeatedly.
 */
export function resolvePageContext(input: ResolvePageContextInput): PageContext {
  const { config, mountNode, doc } = input;

  // 1. Direct from config — highest priority, host has already curated it
  if (config.pageContext && Object.keys(config.pageContext).length > 0) {
    return { ...config.pageContext };
  }

  // 2. Host-supplied selector or element
  if (config.pageContextElement) {
    let target: Element | null = null;
    if (typeof config.pageContextElement === 'string') {
      const targetDoc = doc ?? (typeof document !== 'undefined' ? document : null);
      target = targetDoc?.querySelector(config.pageContextElement) ?? null;
    } else {
      target = config.pageContextElement;
    }
    const fromAttrs = readPageContextFromElement(target);
    if (Object.keys(fromAttrs).length > 0) return fromAttrs;
  }

  // 3. Widget mount node fallback (works automatically with the Liquid block)
  if (mountNode) {
    return readPageContextFromElement(mountNode);
  }

  return {};
}
