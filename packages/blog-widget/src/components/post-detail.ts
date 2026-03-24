import type { BlogPost } from '@automatos/core';
import { h } from '../dom/create-element';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function clearElement(el: HTMLElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function buildSkeleton(): HTMLElement {
  return h('div', { class: 'aw-post-detail' }, [
    h('div', { class: 'aw-skeleton', style: { width: '120px', height: '20px', marginBottom: '16px' } }),
    h('div', { class: 'aw-skeleton', style: { width: '100%', height: '300px', marginBottom: '24px', borderRadius: '12px' } }),
    h('div', { class: 'aw-skeleton', style: { width: '60%', height: '32px', marginBottom: '12px' } }),
    h('div', { class: 'aw-skeleton', style: { width: '40%', height: '16px', marginBottom: '32px' } }),
    h('div', { class: 'aw-skeleton', style: { width: '100%', height: '14px', marginBottom: '8px' } }),
    h('div', { class: 'aw-skeleton', style: { width: '90%', height: '14px', marginBottom: '8px' } }),
    h('div', { class: 'aw-skeleton', style: { width: '95%', height: '14px', marginBottom: '8px' } }),
    h('div', { class: 'aw-skeleton', style: { width: '70%', height: '14px', marginBottom: '8px' } }),
  ]);
}

/**
 * Safely renders pre-sanitized HTML content into a container element.
 * The backend sanitizes all blog content with bleach before serving.
 * This runs inside a Shadow DOM for additional isolation.
 */
function renderSanitizedContent(container: HTMLElement, htmlContent: string): void {
  const template = document.createElement('template');
  template.innerHTML = htmlContent;
  container.appendChild(template.content);

  // Open links in new tab
  for (const a of container.querySelectorAll('a')) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
}

export class PostDetail {
  readonly el: HTMLElement;
  onBack: (() => void) | null = null;

  constructor() {
    this.el = h('div');
    this.showLoading();
  }

  showLoading(): void {
    clearElement(this.el);
    this.el.appendChild(buildSkeleton());
  }

  showPost(post: BlogPost): void {
    clearElement(this.el);

    const backBtn = h('button', { class: 'aw-post-detail-back' }, [
      '\u2190 Back to posts',
    ]);
    backBtn.addEventListener('click', () => this.onBack?.());

    const children: (Node | string)[] = [backBtn];

    if (post.cover_image_url) {
      children.push(
        h('img', {
          class: 'aw-post-detail-cover',
          src: post.cover_image_url,
          alt: post.title,
        }),
      );
    }

    children.push(h('h1', { class: 'aw-post-detail-title' }, [post.title]));

    const metaItems: (Node | string)[] = [
      h('span', null, [post.author_name]),
      h('span', null, [formatDate(post.published_at)]),
      h('span', { class: 'aw-reading-time' }, [`${post.reading_time_minutes} min read`]),
    ];
    if (post.category) {
      metaItems.push(h('span', { class: 'aw-category-badge' }, [post.category]));
    }
    children.push(h('div', { class: 'aw-post-detail-meta' }, metaItems));

    if (post.tags.length > 0) {
      children.push(
        h(
          'div',
          { class: 'aw-post-detail-tags' },
          post.tags.map((tag) => h('span', { class: 'aw-tag-pill' }, [tag])),
        ),
      );
    }

    // Content is pre-sanitized HTML from the backend (bleach).
    // Rendered inside Shadow DOM for additional isolation.
    const article = h('article', { class: 'aw-blog-content' });
    renderSanitizedContent(article, post.content ?? '');
    children.push(article);

    const wrapper = h('div', { class: 'aw-post-detail aw-blog-view-enter' }, children);
    this.el.appendChild(wrapper);
  }
}
