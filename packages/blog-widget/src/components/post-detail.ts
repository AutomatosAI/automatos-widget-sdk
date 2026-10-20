import type { BlogPost } from '@automatos/core';
import { h } from '../dom/create-element';
import { mountPostJsonLd } from '../seo/post-json-ld';
import { aiGeneratedAttrs, aiGeneratedLabelItems } from './ai-label';

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

/** Tags allowed in blog post content. Anything not listed is stripped. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'a', 'img',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'figure', 'figcaption', 'picture', 'source',
  'div', 'span', 'section', 'article',
]);

/** Attributes allowed per tag. Unlisted tags get no attributes. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  source: new Set(['srcset', 'media', 'type']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  code: new Set(['class']),
  pre: new Set(['class']),
  span: new Set(['class']),
  div: new Set(['class']),
};

/** Protocols allowed in href/src attributes. */
const SAFE_URL_RE = /^(?:https?:|mailto:|\/|#)/i;

/**
 * Client-side HTML sanitizer for blog content.
 * Defence-in-depth: backend sanitizes with bleach, this is the client-side gate.
 * Strips disallowed tags/attributes and unsafe URLs before inserting into Shadow DOM.
 */
function sanitizeHTML(html: string): DocumentFragment {
  const template = document.createElement('template');
  // Safe: <template> elements parse HTML without executing scripts or loading resources
  template.innerHTML = html; // eslint-disable-line no-unsanitized/property
  sanitizeNode(template.content);
  return template.content;
}

function sanitizeNode(node: Node): void {
  const toRemove: Node[] = [];

  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        toRemove.push(el);
        continue;
      }

      const allowed = ALLOWED_ATTRS[tag];
      for (const attr of [...el.attributes]) {
        if (!allowed?.has(attr.name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if ((attr.name === 'href' || attr.name === 'src') && !SAFE_URL_RE.test(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }

      sanitizeNode(el);
    }
  }

  for (const dead of toRemove) {
    node.removeChild(dead);
  }
}

/**
 * Safely renders sanitized HTML content into a container element.
 * The backend sanitizes with bleach; this client-side pass is defence-in-depth.
 * Runs inside a Shadow DOM for additional isolation.
 */
function renderSanitizedContent(container: HTMLElement, htmlContent: string): void {
  const fragment = sanitizeHTML(htmlContent);
  container.appendChild(fragment);

  for (const a of container.querySelectorAll('a')) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
}

/** The byline: author, the "AI-generated" label when flagged, date, reading time, category. */
function buildDetailMeta(post: BlogPost): HTMLElement {
  const metaItems: (Node | string)[] = [
    h('span', null, [post.author_name]),
    ...aiGeneratedLabelItems(post),
    h('span', null, [formatDate(post.published_at)]),
    h('span', { class: 'aw-reading-time' }, [`${post.reading_time_minutes} min read`]),
  ];
  if (post.category) {
    metaItems.push(h('span', { class: 'aw-category-badge' }, [post.category]));
  }
  return h('div', { class: 'aw-post-detail-meta' }, metaItems);
}

export class PostDetail {
  readonly el: HTMLElement;
  onBack: (() => void) | null = null;
  /** The open post's JSON-LD in the host page's head; null when none is open. */
  private jsonLd: HTMLScriptElement | null = null;

  constructor() {
    this.el = h('div');
    this.showLoading();
  }

  showLoading(): void {
    this.reset();
    this.el.appendChild(buildSkeleton());
  }

  /** Renders the post and puts its JSON-LD in the host page's head. */
  showPost(post: BlogPost): void {
    this.reset();

    const children: (Node | string)[] = [this.buildBackButton()];

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
    children.push(buildDetailMeta(post));

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

    const wrapper = h(
      'div',
      { class: 'aw-post-detail aw-blog-view-enter', ...aiGeneratedAttrs(post) },
      children,
    );
    this.el.appendChild(wrapper);
    this.jsonLd = mountPostJsonLd(post);
  }

  /** A post that failed to load: the message and the back button, no JSON-LD. */
  showError(message: string): void {
    this.reset();
    this.el.appendChild(
      h('div', { class: 'aw-post-detail aw-blog-view-enter' }, [
        this.buildBackButton(),
        h('h1', { class: 'aw-post-detail-title' }, ['Error loading post']),
        h('p', { class: 'aw-blog-error' }, [message]),
      ]),
    );
  }

  /** The reader left the post page: drop its JSON-LD from the host page. */
  leave(): void {
    this.jsonLd?.remove();
    this.jsonLd = null;
  }

  private reset(): void {
    this.leave();
    clearElement(this.el);
  }

  private buildBackButton(): HTMLElement {
    const backBtn = h('button', { class: 'aw-post-detail-back' }, [
      '\u2190 Back to posts',
    ]);
    backBtn.addEventListener('click', () => this.onBack?.());
    return backBtn;
  }
}
