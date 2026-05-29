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

// Shopify Markets prefix the path with a locale/market handle, e.g.
// `/en-gb/cart` or `/fr/products/x`. Strip one leading 2-letter (optionally
// `xx-yy`) segment before matching. The `(?=\/|$)` lookahead only strips when a
// further segment follows (or the locale stands alone), so real first segments
// like `/cart` stay intact.
const LOCALE_PREFIX = /^\/[a-z]{2}(?:-[a-z]{2})?(?=\/|$)/;

/**
 * Infer the Shopify page type from the URL path as a LAST resort.
 *
 * Shopify theme embeds don't reliably set `data-page-type` on the widget mount
 * node — the embed is theme-authored and optional. Without a `pageType` the
 * cart-idle engine never arms (it gates on `pageType === 'cart'`), so an
 * untagged cart page silently disables the abandon-cart flow. The URL path is
 * the reliable fallback: Shopify routing guarantees `/cart`, `/products/<h>`
 * and `/collections/<h>`.
 *
 * Returns `undefined` for anything it can't classify — including `/` — so a
 * visitor with no host-supplied context still resolves to an empty snapshot
 * rather than a guessed page type. Only ever used to FILL a missing pageType;
 * a host-curated value always wins (see `resolvePageContext`).
 */
export function inferPageTypeFromPath(
  pathname: string | null | undefined,
): string | undefined {
  if (!pathname) return undefined;
  const path = pathname.replace(LOCALE_PREFIX, '') || '/';
  if (path === '/cart' || path.startsWith('/cart/')) return 'cart';
  if (path.startsWith('/products/')) return 'product';
  if (path.startsWith('/collections/')) {
    // `/collections/<c>/products/<p>` is a product page in Shopify routing.
    return path.includes('/products/') ? 'product' : 'collection';
  }
  return undefined;
}

function resolvePathname(doc?: Document): string | undefined {
  const target = doc ?? (typeof document !== 'undefined' ? document : undefined);
  return target?.location?.pathname;
}

function resolveHostContext(input: ResolvePageContextInput): PageContext {
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

/**
 * Resolve the page context using the documented precedence order, then fill a
 * missing `pageType` from the URL path. Pure function — no DOM mutation, safe
 * to call repeatedly.
 */
export function resolvePageContext(input: ResolvePageContextInput): PageContext {
  const resolved = resolveHostContext(input);

  // URL-based pageType fallback — never overrides a host-supplied value, only
  // fills the gap when the theme didn't tag the page. This is what lets the
  // cart-idle engine arm on an untagged `/cart` page.
  if (!resolved.pageType) {
    const inferred = inferPageTypeFromPath(resolvePathname(input.doc));
    if (inferred) return { ...resolved, pageType: inferred };
  }

  return resolved;
}
