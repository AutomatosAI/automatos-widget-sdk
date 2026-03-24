import { init, destroy } from '@automatos/loader';

let currentLayout = 'grid';

function initBlog(layout: string) {
  destroy();
  init({
    apiKey: 'ak_pub_test_123',
    widget: 'blog',
    baseUrl: 'http://localhost:8000',
    layout: layout as 'grid' | 'list' | 'featured' | 'minimal',
    postsPerPage: 6,
    containerSelector: '#blog-container',
    theme: 'light',
  });
  currentLayout = layout;
}

// Expose layout switcher for the HTML buttons
(window as unknown as { __switchBlogLayout: (layout: string) => void }).__switchBlogLayout = (layout: string) => {
  initBlog(layout);
};

// Initial load
initBlog(currentLayout);
