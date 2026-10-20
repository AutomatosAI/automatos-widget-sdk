/**
 * PRD-264 EUAI-08c, end to end through BlogWidget: the server's
 * `ai_generated` flag reaches the cards and the post page, the post's
 * JSON-LD sits in the host page head only while that post is open, and the
 * label's styles ship in the widget's shadow root.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlogPost, BlogPostListResponse } from '@automatos/core';
import { BlogWidget } from '../blog-widget';
import { AI_GENERATED_TEXT, AI_LABEL_ATTR } from '../components/ai-label';
import { AI_DIGITAL_SOURCE_TYPE, POST_JSON_LD_ATTR } from '../seo/post-json-ld';

const BASE_URL = 'https://api.example.test';
const POSTS_PATH = '/api/widgets/blog/posts';
const LABEL_SELECTOR = `[${AI_LABEL_ATTR}]`;
const JSON_LD_SELECTOR = `script[${POST_JSON_LD_ATTR}]`;

const AGENT_POST: BlogPost = {
  id: 'p-agent',
  title: 'Agent post',
  slug: 'agent-post',
  excerpt: 'Written by an agent.',
  cover_image_url: null,
  tags: [],
  category: null,
  author_name: 'Store Agent',
  published_at: '2026-10-02T09:00:00Z',
  reading_time_minutes: 2,
  ai_generated: true,
};

const HUMAN_POST: BlogPost = {
  ...AGENT_POST,
  id: 'p-human',
  title: 'Human post',
  slug: 'human-post',
  author_name: 'Store Owner',
  ai_generated: false,
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function listResponse(posts: BlogPost[]): BlogPostListResponse {
  return { posts, total: posts.length, page: 1, per_page: 6, total_pages: 1 };
}

/** Let pending fetch promises and their handlers run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Serves the listing and each post by slug; `hold` keeps a post's request open. */
function stubFetch(posts: BlogPost[], hold: Promise<void> = Promise.resolve()): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(String(url)).pathname;
      if (path === POSTS_PATH) return jsonResponse(listResponse(posts));
      const slug = decodeURIComponent(path.slice(POSTS_PATH.length + 1));
      await hold;
      return jsonResponse({ ...posts.find((p) => p.slug === slug), content: '<p>Body</p>' });
    }),
  );
}

let widget: BlogWidget | null = null;

function mountWidget(): ShadowRoot {
  widget = new BlogWidget({ apiKey: 'ak_pub_test', widget: 'blog', baseUrl: BASE_URL });
  const host = document.getElementById('automatos-blog-widget');
  if (!host?.shadowRoot) throw new Error('blog widget host did not mount');
  return host.shadowRoot;
}

function cardFor(shadow: ShadowRoot, title: string): HTMLElement {
  const cards = [...shadow.querySelectorAll<HTMLElement>('.aw-post-card')];
  const card = cards.find((el) => el.querySelector('.aw-post-card-title')?.textContent === title);
  if (!card) throw new Error(`no card for "${title}"`);
  return card;
}

function headJsonLd(): Record<string, unknown>[] {
  return [...document.head.querySelectorAll(JSON_LD_SELECTOR)].map(
    (el) => JSON.parse(el.textContent ?? '') as Record<string, unknown>,
  );
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  widget?.destroy();
  widget = null;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BlogWidget AI-generated posts (PRD-264 EUAI-08c)', () => {
  it('labels the flagged card only', async () => {
    stubFetch([AGENT_POST, HUMAN_POST]);
    const shadow = mountWidget();
    await settle();

    expect(cardFor(shadow, 'Agent post').querySelector(LABEL_SELECTOR)?.textContent)
      .toBe(AI_GENERATED_TEXT);
    expect(cardFor(shadow, 'Human post').querySelector(LABEL_SELECTOR)).toBeNull();
  });

  it('ships the label styles in the shadow root', () => {
    stubFetch([]);
    const shadow = mountWidget();

    expect(shadow.querySelector('style')?.textContent).toContain('.aw-ai-label');
  });

  it('labels the flagged post page and marks its JSON-LD until the reader goes back', async () => {
    stubFetch([AGENT_POST, HUMAN_POST]);
    const shadow = mountWidget();
    await settle();

    cardFor(shadow, 'Agent post').click();
    await settle();

    expect(shadow.querySelector(`.aw-post-detail-meta ${LABEL_SELECTOR}`)?.textContent)
      .toBe(AI_GENERATED_TEXT);
    const [data, ...extra] = headJsonLd();
    expect(extra).toHaveLength(0);
    expect(data.headline).toBe('Agent post');
    expect(data.digitalSourceType).toBe(AI_DIGITAL_SOURCE_TYPE);

    shadow.querySelector<HTMLElement>('.aw-post-detail-back')?.click();
    expect(headJsonLd()).toHaveLength(0);
  });

  it('emits unmarked JSON-LD and no label for a post that is not flagged', async () => {
    stubFetch([AGENT_POST, HUMAN_POST]);
    const shadow = mountWidget();
    await settle();

    cardFor(shadow, 'Human post').click();
    await settle();

    expect(shadow.querySelector(`.aw-post-detail ${LABEL_SELECTOR}`)).toBeNull();
    const [data] = headJsonLd();
    expect(data.headline).toBe('Human post');
    expect(data.digitalSourceType).toBeUndefined();
  });

  it('leaves no JSON-LD behind when destroyed while a post is loading', async () => {
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    stubFetch([AGENT_POST], hold);
    const shadow = mountWidget();
    await settle();

    cardFor(shadow, 'Agent post').click();
    widget?.destroy();
    widget = null;
    release();
    await settle();

    expect(headJsonLd()).toHaveLength(0);
  });
});
