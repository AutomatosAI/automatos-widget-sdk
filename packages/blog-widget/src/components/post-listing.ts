import type { BlogPost, BlogLayout } from '@automatos/core';
import { h } from '../dom/create-element';
import { PostCard } from './post-card';

function buildSkeletonCard(): HTMLElement {
  return h('div', { class: 'aw-skeleton-card' }, [
    h('div', { class: 'aw-skeleton-cover' }),
    h('div', { class: 'aw-skeleton-body' }, [
      h('div', { class: 'aw-skeleton-line aw-skeleton-line--title' }),
      h('div', { class: 'aw-skeleton-line aw-skeleton-line--long' }),
      h('div', { class: 'aw-skeleton-line aw-skeleton-line--medium' }),
      h('div', { class: 'aw-skeleton-line aw-skeleton-line--short' }),
    ]),
  ]);
}

function clearElement(el: HTMLElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export class PostListing {
  readonly el: HTMLElement;
  private layout: BlogLayout;
  private postsPerPage: number;
  private postsContainer: HTMLElement;
  private paginationEl: HTMLElement;
  private currentPage = 1;
  private totalPages = 1;

  onPostClick: ((slug: string) => void) | null = null;
  onPageChange: ((page: number) => void) | null = null;

  constructor(layout: BlogLayout, postsPerPage: number) {
    this.layout = layout;
    this.postsPerPage = postsPerPage;
    this.postsContainer = h('div');
    this.paginationEl = h('div', { class: 'aw-pagination' });
    this.el = h('div', { class: 'aw-blog-view-enter' }, [
      this.postsContainer,
      this.paginationEl,
    ]);
    this.showLoading();
  }

  showLoading(): void {
    clearElement(this.postsContainer);
    const count = this.layout === 'minimal' ? this.postsPerPage : Math.min(this.postsPerPage, 4);
    const wrapper = this.createLayoutWrapper();
    for (let i = 0; i < count; i++) {
      wrapper.appendChild(buildSkeletonCard());
    }
    this.postsContainer.appendChild(wrapper);
    clearElement(this.paginationEl);
  }

  showPosts(posts: BlogPost[], page: number, totalPages: number): void {
    this.currentPage = page;
    this.totalPages = totalPages;
    clearElement(this.postsContainer);

    if (posts.length === 0) {
      this.postsContainer.appendChild(
        h('div', { class: 'aw-blog-empty' }, ['No posts yet.']),
      );
      clearElement(this.paginationEl);
      return;
    }

    if (this.layout === 'featured' && posts.length > 0) {
      this.renderFeaturedLayout(posts);
    } else {
      const wrapper = this.createLayoutWrapper();
      for (const post of posts) {
        const card = new PostCard(post, this.layout);
        card.onClick = (slug) => this.onPostClick?.(slug);
        wrapper.appendChild(card.el);
      }
      this.postsContainer.appendChild(wrapper);
    }

    this.renderPagination();
  }

  showError(message: string): void {
    clearElement(this.postsContainer);
    const retryBtn = h('button', { class: 'aw-blog-error-retry' }, ['Retry']);
    retryBtn.addEventListener('click', () => {
      this.showLoading();
      this.onPageChange?.(this.currentPage);
    });
    this.postsContainer.appendChild(
      h('div', { class: 'aw-blog-error' }, [
        h('p', null, [message]),
        retryBtn,
      ]),
    );
    clearElement(this.paginationEl);
  }

  private renderFeaturedLayout(posts: BlogPost[]): void {
    const [first, ...rest] = posts;
    const wrapper = h('div', { class: 'aw-post-featured-grid' });

    const featuredCard = new PostCard(first, 'featured');
    featuredCard.onClick = (slug) => this.onPostClick?.(slug);
    wrapper.appendChild(featuredCard.el);

    if (rest.length > 0) {
      const grid = h('div', { class: 'aw-post-featured-rest' });
      for (const post of rest) {
        const card = new PostCard(post, 'grid');
        card.onClick = (slug) => this.onPostClick?.(slug);
        grid.appendChild(card.el);
      }
      wrapper.appendChild(grid);
    }

    this.postsContainer.appendChild(wrapper);
  }

  private createLayoutWrapper(): HTMLElement {
    switch (this.layout) {
      case 'list':
        return h('div', { class: 'aw-post-list' });
      case 'minimal':
        return h('div', { class: 'aw-post-minimal-list' });
      case 'grid':
      default:
        return h('div', { class: 'aw-post-grid' });
    }
  }

  private renderPagination(): void {
    clearElement(this.paginationEl);
    if (this.totalPages <= 1) return;

    const prevBtn = h('button', {
      class: 'aw-pagination-btn',
      disabled: this.currentPage <= 1,
    }, ['Previous']) as HTMLButtonElement;
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) this.onPageChange?.(this.currentPage - 1);
    });

    const nextBtn = h('button', {
      class: 'aw-pagination-btn',
      disabled: this.currentPage >= this.totalPages,
    }, ['Next']) as HTMLButtonElement;
    nextBtn.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) this.onPageChange?.(this.currentPage + 1);
    });

    const info = h('span', { class: 'aw-pagination-info' }, [
      `Page ${this.currentPage} of ${this.totalPages}`,
    ]);

    this.paginationEl.append(prevBtn, info, nextBtn);
  }
}
