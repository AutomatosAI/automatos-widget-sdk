export const animationCSS = /* css */ `
@keyframes aw-blog-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes aw-skeleton-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}

/* Staggered card entrance */
.aw-post-card:nth-child(1) { animation-delay: 0s; }
.aw-post-card:nth-child(2) { animation-delay: 0.05s; }
.aw-post-card:nth-child(3) { animation-delay: 0.1s; }
.aw-post-card:nth-child(4) { animation-delay: 0.15s; }
.aw-post-card:nth-child(5) { animation-delay: 0.2s; }
.aw-post-card:nth-child(6) { animation-delay: 0.25s; }

.aw-skeleton-card:nth-child(1) { animation-delay: 0s; }
.aw-skeleton-card:nth-child(2) { animation-delay: 0.1s; }
.aw-skeleton-card:nth-child(3) { animation-delay: 0.2s; }
.aw-skeleton-card:nth-child(4) { animation-delay: 0.3s; }

/* Smooth view transitions */
.aw-blog-view-enter {
  animation: aw-blog-fade-in 0.3s ease both;
}
`;
