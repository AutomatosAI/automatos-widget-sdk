import { describe, expect, it } from 'vitest';
import {
  inferPageTypeFromPath,
  resolvePageContext,
} from '../page-context';
import type { PageContext } from '../types';

/**
 * URL-based pageType fallback (cart-idle regression). Shopify theme embeds
 * don't reliably tag the mount node with data-page-type; without it the
 * cart-idle engine never arms. resolvePageContext now infers a missing
 * pageType from the path — but only when the host supplied none.
 */

// A fake Document carrying just the pathname the function reads. Core tests run
// under the node environment (no jsdom), so we inject the path directly.
const docAt = (pathname: string): Document =>
  ({ location: { pathname } }) as unknown as Document;

// Minimal element stub for the mount-node branch (no jsdom in core tests).
const elWith = (attrs: Record<string, string>): Element =>
  ({ getAttribute: (k: string) => (k in attrs ? attrs[k] : null) }) as unknown as Element;

describe('inferPageTypeFromPath', () => {
  it.each([
    ['/cart', 'cart'],
    ['/cart/', 'cart'],
    ['/en-gb/cart', 'cart'],
    ['/fr/cart', 'cart'],
    ['/products/fan-unit-pro', 'product'],
    ['/en/products/fan-unit-pro', 'product'],
    ['/collections/all', 'collection'],
    ['/collections/all/products/x', 'product'],
  ])('maps %s -> %s', (path, expected) => {
    expect(inferPageTypeFromPath(path)).toBe(expected);
  });

  it.each([
    ['/'],
    [''],
    ['/checkout'],
    ['/pages/about'],
    ['/fr'], // locale-only path (market homepage) must NOT classify
    ['/search'],
  ])('returns undefined for %s', (path) => {
    expect(inferPageTypeFromPath(path)).toBeUndefined();
  });

  it('returns undefined for null / undefined', () => {
    expect(inferPageTypeFromPath(null)).toBeUndefined();
    expect(inferPageTypeFromPath(undefined)).toBeUndefined();
  });
});

describe('resolvePageContext — URL fallback', () => {
  it('fills pageType from the URL when the host supplied none', () => {
    const ctx = resolvePageContext({ config: {}, doc: docAt('/cart') });
    expect(ctx.pageType).toBe('cart');
  });

  it('does not infer for a non-shop path (keeps {} on "/")', () => {
    expect(resolvePageContext({ config: {}, doc: docAt('/') })).toEqual({});
  });

  it('never overrides a config-supplied pageType', () => {
    const pageContext: PageContext = { pageType: 'product', productHandle: 'x' };
    const ctx = resolvePageContext({ config: { pageContext }, doc: docAt('/cart') });
    expect(ctx.pageType).toBe('product');
    expect(ctx.productHandle).toBe('x');
  });

  it('never overrides a mount-node pageType', () => {
    const mountNode = elWith({ 'data-page-type': 'collection' });
    const ctx = resolvePageContext({ config: {}, mountNode, doc: docAt('/cart') });
    expect(ctx.pageType).toBe('collection');
  });

  it('fills pageType when the mount node has attrs but no page type', () => {
    const mountNode = elWith({ 'data-shop-domain': 'example.myshopify.com' });
    const ctx = resolvePageContext({ config: {}, mountNode, doc: docAt('/cart') });
    expect(ctx.pageType).toBe('cart');
    expect(ctx.shopDomain).toBe('example.myshopify.com');
  });
});
