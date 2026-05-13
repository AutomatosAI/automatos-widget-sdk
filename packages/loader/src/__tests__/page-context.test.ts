import { describe, expect, it } from 'vitest';
import {
  readPageContextFromElement,
  resolvePageContext,
} from '../proactive/page-context';

describe('readPageContextFromElement', () => {
  it('returns empty object for null element', () => {
    expect(readPageContextFromElement(null)).toEqual({});
  });

  it('reads all known data attrs from an element', () => {
    const el = document.createElement('div');
    el.setAttribute('data-page-type', 'product');
    el.setAttribute('data-product-id', '12345');
    el.setAttribute('data-product-handle', 'fan-unit-pro');
    el.setAttribute('data-product-title', 'Fan Unit Pro');
    el.setAttribute('data-shop-domain', 'example.myshopify.com');
    el.setAttribute('data-cart-item-count', '3');
    el.setAttribute('data-product-available', 'true');

    const ctx = readPageContextFromElement(el);
    expect(ctx.pageType).toBe('product');
    expect(ctx.productId).toBe('12345');
    expect(ctx.productHandle).toBe('fan-unit-pro');
    expect(ctx.productTitle).toBe('Fan Unit Pro');
    expect(ctx.shopDomain).toBe('example.myshopify.com');
  });

  it('coerces numeric attrs to numbers', () => {
    const el = document.createElement('div');
    el.setAttribute('data-cart-item-count', '7');
    expect(readPageContextFromElement(el).cartItemCount).toBe(7);
  });

  it('coerces boolean attrs', () => {
    const el = document.createElement('div');
    el.setAttribute('data-product-available', 'true');
    expect(readPageContextFromElement(el).productAvailable).toBe(true);

    el.setAttribute('data-product-available', 'false');
    expect(readPageContextFromElement(el).productAvailable).toBe(false);
  });

  it('skips empty attribute values', () => {
    const el = document.createElement('div');
    el.setAttribute('data-page-type', 'product');
    el.setAttribute('data-product-id', '');
    el.setAttribute('data-product-handle', '');

    const ctx = readPageContextFromElement(el);
    expect(ctx.pageType).toBe('product');
    expect('productId' in ctx).toBe(false);
    expect('productHandle' in ctx).toBe(false);
  });

  it('drops unknown data attrs', () => {
    const el = document.createElement('div');
    el.setAttribute('data-page-type', 'product');
    el.setAttribute('data-something-random', 'leak');
    const ctx = readPageContextFromElement(el);
    expect(ctx.pageType).toBe('product');
    expect(JSON.stringify(ctx)).not.toContain('leak');
  });
});

describe('resolvePageContext', () => {
  it('prefers config.pageContext when populated', () => {
    const mountNode = document.createElement('div');
    mountNode.setAttribute('data-page-type', 'collection');
    const ctx = resolvePageContext({
      config: { pageContext: { pageType: 'product', productHandle: 'x' } },
      mountNode,
    });
    expect(ctx.pageType).toBe('product');
    expect(ctx.productHandle).toBe('x');
    // mount node ignored when config is present
  });

  it('falls back to mount node data attrs when config is empty', () => {
    const mountNode = document.createElement('div');
    mountNode.setAttribute('data-page-type', 'collection');
    mountNode.setAttribute('data-collection-handle', 'all');
    const ctx = resolvePageContext({
      config: {},
      mountNode,
    });
    expect(ctx.pageType).toBe('collection');
    expect(ctx.collectionHandle).toBe('all');
  });

  it('uses pageContextElement selector when provided', () => {
    const target = document.createElement('div');
    target.id = 'shopify-context';
    target.setAttribute('data-page-type', 'cart');
    target.setAttribute('data-cart-item-count', '4');
    document.body.appendChild(target);

    const ctx = resolvePageContext({
      config: { pageContextElement: '#shopify-context' },
    });
    expect(ctx.pageType).toBe('cart');
    expect(ctx.cartItemCount).toBe(4);

    document.body.removeChild(target);
  });

  it('returns {} when nothing is provided', () => {
    expect(resolvePageContext({ config: {} })).toEqual({});
  });
});
