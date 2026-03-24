import {
  AutomatosClient,
  type AutomatosConfig,
  type BlogLayout,
  type BlogPost,
  type BlogPostListResponse,
} from '@automatos/core';
import { createBlogShadowHost } from './dom/shadow-host';
import { PostListing } from './components/post-listing';
import { PostDetail } from './components/post-detail';
import { baseCSS } from './styles/base';
import { componentCSS } from './styles/components';
import { animationCSS } from './styles/animations';

export class BlogWidget {
  private client: AutomatosClient;
  private config: AutomatosConfig;
  private host!: HTMLElement;
  private container!: HTMLElement;
  private listing!: PostListing;
  private detail!: PostDetail;

  private cache = new Map<number, BlogPostListResponse>();

  constructor(config: AutomatosConfig) {
    this.config = config;
    this.client = new AutomatosClient(config);
    this.mount();
    this.loadPage(1);

    // Pre-authenticate for server keys
    if (!config.apiKey.startsWith('ak_pub_')) {
      this.client.authenticate().catch(() => {
        // Will retry on first API call
      });
    }
  }

  destroy(): void {
    this.client.destroy();
    this.host.remove();
  }

  private mount(): void {
    const css = [baseCSS, componentCSS, animationCSS].join('\n');
    const { host, container } = createBlogShadowHost(this.config, css);
    this.host = host;
    this.container = container;

    const layout: BlogLayout = this.config.layout ?? 'grid';
    const postsPerPage = this.config.postsPerPage ?? 6;

    this.listing = new PostListing(layout, postsPerPage);
    this.listing.onPostClick = (slug) => this.navigateToPost(slug);
    this.listing.onPageChange = (page) => this.loadPage(page);

    this.detail = new PostDetail();
    this.detail.onBack = () => this.navigateToListing();

    this.container.appendChild(this.listing.el);
  }

  private async loadPage(page: number): Promise<void> {

    const cached = this.cache.get(page);
    if (cached) {
      this.listing.showPosts(cached.posts, cached.page, cached.total_pages);
      return;
    }

    this.listing.showLoading();

    try {
      const response = await this.client.listPosts({
        page,
        perPage: this.config.postsPerPage ?? 6,
        category: this.config.category,
        tag: this.config.tag,
      });

      this.cache.set(page, response);
      this.listing.showPosts(response.posts, response.page, response.total_pages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      this.listing.showError(message);
    }
  }

  private async navigateToPost(slug: string): Promise<void> {
    this.container.replaceChildren(this.detail.el);
    this.detail.showLoading();

    try {
      const post = await this.client.getPost(slug);
      this.detail.showPost(post);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load post';
      // Show error inline in detail view, with back button still available
      this.detail.showPost({
        id: '',
        title: 'Error loading post',
        slug,
        excerpt: message,
        cover_image_url: null,
        tags: [],
        category: null,
        author_name: '',
        published_at: new Date().toISOString(),
        reading_time_minutes: 0,
        content: `<p>${message}</p>`,
      } satisfies BlogPost);
    }
  }

  private navigateToListing(): void {
    this.container.replaceChildren(this.listing.el);
  }
}
