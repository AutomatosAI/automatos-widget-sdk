/**
 * PRD-264 EUAI-08c (EU AI Act Art. 50(4) and 50(5)): a post the server flags
 * `ai_generated` shows "AI-generated" by the byline on every card layout and
 * on the post page, and the post page's JSON-LD marks it AI-generated. A post
 * without the flag shows no label and no mark.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { BlogLayout, BlogPost } from '@automatos/core';
import { PostCard } from '../components/post-card';
import { PostDetail } from '../components/post-detail';
import {
  AI_GENERATED_ATTR,
  AI_GENERATED_TEXT,
  AI_LABEL_ATTR,
} from '../components/ai-label';
import {
  AI_DIGITAL_SOURCE_TYPE,
  POST_JSON_LD_ATTR,
  buildPostJsonLd,
  serializeJsonLd,
} from '../seo/post-json-ld';
import { aiLabelCSS } from '../styles/ai-label';

const LAYOUTS: BlogLayout[] = ['grid', 'list', 'featured', 'minimal'];
const LABEL_SELECTOR = `[${AI_LABEL_ATTR}]`;
const JSON_LD_SELECTOR = `script[${POST_JSON_LD_ATTR}]`;

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-1',
    title: 'Spring opening hours',
    slug: 'spring-opening-hours',
    excerpt: 'When the shop is open this spring.',
    cover_image_url: 'https://cdn.example.test/cover.png',
    tags: ['news', 'hours'],
    category: 'Updates',
    author_name: 'Shop Writer',
    published_at: '2026-10-01T09:00:00Z',
    reading_time_minutes: 3,
    content: '<p>We open at nine.</p>',
    ...overrides,
  };
}

function headJsonLd(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll<HTMLScriptElement>(JSON_LD_SELECTOR)];
}

function parsedJsonLd(): Record<string, unknown> {
  const scripts = headJsonLd();
  expect(scripts).toHaveLength(1);
  expect(scripts[0].type).toBe('application/ld+json');
  return JSON.parse(scripts[0].textContent ?? '') as Record<string, unknown>;
}

let detail: PostDetail | null = null;

afterEach(() => {
  detail?.leave();
  detail = null;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('PostCard AI-generated label (PRD-264 EUAI-08c)', () => {
  for (const layout of LAYOUTS) {
    it(`shows "AI-generated" in the ${layout} card byline when the post is flagged`, () => {
      const card = new PostCard(makePost({ ai_generated: true }), layout);
      const label = card.el.querySelector(LABEL_SELECTOR);

      expect(label?.textContent).toBe(AI_GENERATED_TEXT);
      expect(label?.closest('.aw-post-card-meta')).not.toBeNull();
      expect(card.el.getAttribute(AI_GENERATED_ATTR)).toBe('true');
    });

    it(`shows no label on a ${layout} card when the post is not flagged`, () => {
      for (const flag of [false, undefined]) {
        const card = new PostCard(makePost({ ai_generated: flag }), layout);

        expect(card.el.querySelector(LABEL_SELECTOR)).toBeNull();
        expect(card.el.hasAttribute(AI_GENERATED_ATTR)).toBe(false);
        expect(card.el.textContent).not.toContain(AI_GENERATED_TEXT);
      }
    });
  }

  it('puts the label right after the author name', () => {
    const card = new PostCard(makePost({ ai_generated: true }), 'grid');
    const meta = card.el.querySelector('.aw-post-card-meta');
    const items = [...(meta?.children ?? [])].map((el) => el.textContent);

    expect(items.slice(0, 2)).toEqual(['Shop Writer', AI_GENERATED_TEXT]);
  });
});

describe('PostDetail AI-generated label and JSON-LD (PRD-264 EUAI-08c)', () => {
  it('shows "AI-generated" in the post page byline when the post is flagged', () => {
    detail = new PostDetail();
    detail.showPost(makePost({ ai_generated: true }));

    const label = detail.el.querySelector(LABEL_SELECTOR);
    expect(label?.textContent).toBe(AI_GENERATED_TEXT);
    expect(label?.closest('.aw-post-detail-meta')).not.toBeNull();
    expect(detail.el.querySelector(`.aw-post-detail[${AI_GENERATED_ATTR}="true"]`)).not.toBeNull();
  });

  it('emits JSON-LD in the host page head that marks the post AI-generated', () => {
    detail = new PostDetail();
    detail.showPost(makePost({ ai_generated: true }));

    const data = parsedJsonLd();
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('BlogPosting');
    expect(data.headline).toBe('Spring opening hours');
    expect(data.digitalSourceType).toBe(AI_DIGITAL_SOURCE_TYPE);
    expect(data.author).toBeUndefined();
  });

  it('shows no label and emits unmarked JSON-LD when the post is not flagged', () => {
    for (const flag of [false, undefined]) {
      detail = new PostDetail();
      detail.showPost(makePost({ ai_generated: flag }));

      expect(detail.el.querySelector(LABEL_SELECTOR)).toBeNull();
      expect(detail.el.textContent).not.toContain(AI_GENERATED_TEXT);
      const data = parsedJsonLd();
      expect(data.digitalSourceType).toBeUndefined();
      expect(data.author).toEqual({ '@type': 'Person', name: 'Shop Writer' });

      detail.leave();
      expect(headJsonLd()).toHaveLength(0);
    }
  });

  it('keeps one JSON-LD block, for the open post only', () => {
    detail = new PostDetail();
    detail.showPost(makePost({ ai_generated: true }));
    detail.showPost(makePost({ slug: 'second', title: 'Second post', ai_generated: false }));

    const data = parsedJsonLd();
    expect(data.headline).toBe('Second post');
    expect(data.digitalSourceType).toBeUndefined();
  });

  it('drops the JSON-LD when loading, on an error and on leave', () => {
    detail = new PostDetail();
    detail.showPost(makePost({ ai_generated: true }));
    detail.showLoading();
    expect(headJsonLd()).toHaveLength(0);

    detail.showPost(makePost({ ai_generated: true }));
    detail.showError('Failed to fetch post');
    expect(headJsonLd()).toHaveLength(0);
    expect(detail.el.textContent).toContain('Failed to fetch post');

    detail.showPost(makePost({ ai_generated: true }));
    detail.leave();
    expect(headJsonLd()).toHaveLength(0);
  });
});

describe('post JSON-LD builder (PRD-264 EUAI-08c)', () => {
  it('uses the IPTC term for AI-made content', () => {
    expect(AI_DIGITAL_SOURCE_TYPE).toBe(
      'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
    );
  });

  it('leaves out fields the post does not have', () => {
    const data = buildPostJsonLd(
      makePost({ cover_image_url: null, category: null, tags: [], author_name: '' }),
    );

    expect(data).not.toHaveProperty('image');
    expect(data).not.toHaveProperty('articleSection');
    expect(data).not.toHaveProperty('keywords');
    expect(data).not.toHaveProperty('author');
    expect(data).not.toHaveProperty('digitalSourceType');
  });

  it('escapes "<" so post text cannot close the script block', () => {
    const text = serializeJsonLd(buildPostJsonLd(makePost({ title: 'a </script><b>x' })));

    expect(text).not.toContain('<');
    expect((JSON.parse(text) as Record<string, unknown>).headline).toBe('a </script><b>x');
  });
});

describe('AI-generated label styles (PRD-264 EUAI-08c, Art. 50(5))', () => {
  it('reads no theme variable, so themeOverrides cannot hide the label', () => {
    expect(aiLabelCSS).toContain('.aw-ai-label');
    expect(aiLabelCSS).not.toMatch(/var\(/);
    expect(aiLabelCSS).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  });
});
