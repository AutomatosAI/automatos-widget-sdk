import type { BlogPost, BlogLayout } from '@automatos/core';
import { h } from '../dom/create-element';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildMeta(post: BlogPost): HTMLElement {
  return h('div', { class: 'aw-post-card-meta' }, [
    h('span', null, [post.author_name]),
    h('span', null, [formatDate(post.published_at)]),
    h('span', { class: 'aw-reading-time' }, [`${post.reading_time_minutes} min read`]),
  ]);
}

function buildTags(post: BlogPost): HTMLElement | undefined {
  if (post.tags.length === 0) return undefined;
  return h(
    'div',
    { class: 'aw-post-card-tags' },
    post.tags.map((tag) => h('span', { class: 'aw-tag-pill' }, [tag])),
  );
}

function buildCover(post: BlogPost): HTMLElement {
  if (post.cover_image_url) {
    return h('img', {
      class: 'aw-post-card-cover',
      src: post.cover_image_url,
      alt: post.title,
      loading: 'lazy',
    });
  }
  return h('div', { class: 'aw-post-card-cover-placeholder' });
}

function buildGridCard(post: BlogPost): HTMLElement {
  const tags = buildTags(post);
  const children: (Node | string)[] = [
    h('h3', { class: 'aw-post-card-title' }, [post.title]),
    h('p', { class: 'aw-post-card-excerpt' }, [post.excerpt]),
    buildMeta(post),
  ];
  if (tags) children.push(tags);

  return h('article', { class: 'aw-post-card' }, [
    buildCover(post),
    h('div', { class: 'aw-post-card-body' }, children),
  ]);
}

function buildListCard(post: BlogPost): HTMLElement {
  const tags = buildTags(post);
  const children: (Node | string)[] = [
    h('h3', { class: 'aw-post-card-title' }, [post.title]),
    h('p', { class: 'aw-post-card-excerpt' }, [post.excerpt]),
    buildMeta(post),
  ];
  if (tags) children.push(tags);

  return h('article', { class: 'aw-post-card aw-post-card--list' }, [
    buildCover(post),
    h('div', { class: 'aw-post-card-body' }, children),
  ]);
}

function buildFeaturedCard(post: BlogPost): HTMLElement {
  return h('article', { class: 'aw-post-card aw-post-card--featured' }, [
    buildCover(post),
    h('div', { class: 'aw-post-card-overlay' }, [
      h('h3', { class: 'aw-post-card-title' }, [post.title]),
      buildMeta(post),
    ]),
    h('div', { class: 'aw-post-card-body' }, [
      h('p', { class: 'aw-post-card-excerpt' }, [post.excerpt]),
    ]),
  ]);
}

function buildMinimalCard(post: BlogPost): HTMLElement {
  return h('article', { class: 'aw-post-card aw-post-card--minimal' }, [
    h('div', { class: 'aw-post-card-body' }, [
      h('h3', { class: 'aw-post-card-title' }, [post.title]),
      h('div', { class: 'aw-post-card-meta' }, [
        h('span', null, [formatDate(post.published_at)]),
        h('span', { class: 'aw-reading-time' }, [`${post.reading_time_minutes} min`]),
      ]),
    ]),
  ]);
}

export class PostCard {
  readonly el: HTMLElement;
  private _onClick: ((slug: string) => void) | null = null;

  constructor(post: BlogPost, layout: BlogLayout) {
    switch (layout) {
      case 'list':
        this.el = buildListCard(post);
        break;
      case 'featured':
        this.el = buildFeaturedCard(post);
        break;
      case 'minimal':
        this.el = buildMinimalCard(post);
        break;
      default:
        this.el = buildGridCard(post);
    }

    this.el.addEventListener('click', () => {
      this._onClick?.(post.slug);
    });
  }

  set onClick(cb: (slug: string) => void) {
    this._onClick = cb;
  }
}
