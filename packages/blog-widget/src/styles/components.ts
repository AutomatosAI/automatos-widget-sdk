export const componentCSS = /* css */ `
/* ── Post Card: Grid ── */
.aw-post-card {
  background: var(--aw-bg);
  border: 1px solid var(--aw-border);
  border-radius: var(--aw-radius);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  animation: aw-blog-fade-in 0.3s ease both;
}

.aw-post-card:hover {
  box-shadow: var(--aw-shadow);
  transform: translateY(-2px);
}

.aw-post-card-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.aw-post-card-cover-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, var(--aw-primary) 0%, var(--aw-primary-hover) 100%);
  opacity: 0.15;
}

.aw-post-card-body {
  padding: 16px;
}

.aw-post-card-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--aw-text);
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.aw-post-card-excerpt {
  font-size: 0.9em;
  color: var(--aw-text-secondary);
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.aw-post-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.8em;
  color: var(--aw-text-secondary);
}

.aw-post-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.aw-tag-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--aw-bg-secondary);
  color: var(--aw-text-secondary);
  font-size: 0.75em;
  border: 1px solid var(--aw-border);
}

.aw-reading-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ── Post Card: List variant ── */
.aw-post-card--list {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.aw-post-card--list .aw-post-card-cover,
.aw-post-card--list .aw-post-card-cover-placeholder {
  width: 120px;
  min-width: 120px;
  aspect-ratio: auto;
  height: 100%;
}

.aw-post-card--list .aw-post-card-body {
  flex: 1;
}

.aw-post-card--list .aw-post-card-excerpt {
  -webkit-line-clamp: 2;
}

/* ── Post Card: Featured variant ── */
.aw-post-card--featured .aw-post-card-cover,
.aw-post-card--featured .aw-post-card-cover-placeholder {
  aspect-ratio: 21 / 9;
}

.aw-post-card--featured {
  position: relative;
}

.aw-post-card--featured .aw-post-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px 16px 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  color: #fff;
}

.aw-post-card--featured .aw-post-card-overlay .aw-post-card-title {
  font-size: 1.5em;
  color: #fff;
}

.aw-post-card--featured .aw-post-card-overlay .aw-post-card-meta {
  color: rgba(255,255,255,0.8);
}

/* ── Post Card: Minimal variant ── */
.aw-post-card--minimal {
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--aw-border);
  background: transparent;
  padding: 12px 0;
}

.aw-post-card--minimal:hover {
  box-shadow: none;
  transform: none;
}

.aw-post-card--minimal .aw-post-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  gap: 16px;
}

.aw-post-card--minimal .aw-post-card-title {
  font-size: 1em;
  margin-bottom: 0;
  -webkit-line-clamp: 1;
}

.aw-post-card--minimal .aw-post-card-meta {
  flex-shrink: 0;
}

/* ── Post Listing: Grid layout ── */
.aw-post-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 640px) {
  .aw-post-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Post Listing: List layout ── */
.aw-post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Post Listing: Featured layout ── */
.aw-post-featured-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.aw-post-featured-rest {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 640px) {
  .aw-post-featured-rest {
    grid-template-columns: 1fr;
  }
}

/* ── Post Listing: Minimal layout ── */
.aw-post-minimal-list {
  display: flex;
  flex-direction: column;
}

/* ── Pagination ── */
.aw-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  font-size: 0.9em;
}

.aw-pagination-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--aw-border);
  background: var(--aw-bg);
  color: var(--aw-text);
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.15s ease;
}

.aw-pagination-btn:hover:not(:disabled) {
  background: var(--aw-bg-secondary);
}

.aw-pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.aw-pagination-info {
  color: var(--aw-text-secondary);
}

/* ── Post Detail ── */
.aw-post-detail {
  animation: aw-blog-fade-in 0.3s ease both;
}

.aw-post-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  color: var(--aw-primary);
  font-size: 0.9em;
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
  margin-bottom: 16px;
}

.aw-post-detail-back:hover {
  color: var(--aw-primary-hover);
}

.aw-post-detail-cover {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: var(--aw-radius);
  margin-bottom: 24px;
}

.aw-post-detail-title {
  font-size: 2em;
  font-weight: 700;
  color: var(--aw-text);
  margin-bottom: 12px;
  line-height: 1.3;
}

.aw-post-detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.9em;
  color: var(--aw-text-secondary);
  margin-bottom: 8px;
}

.aw-post-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 32px;
}

.aw-category-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  background: var(--aw-primary);
  color: #fff;
  font-size: 0.8em;
}

/* ── Empty / Error / Loading states ── */
.aw-blog-empty,
.aw-blog-error {
  text-align: center;
  padding: 48px 16px;
  color: var(--aw-text-secondary);
}

.aw-blog-error-retry {
  margin-top: 12px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--aw-border);
  background: var(--aw-bg);
  color: var(--aw-text);
  cursor: pointer;
  font-size: 0.9em;
}

.aw-blog-error-retry:hover {
  background: var(--aw-bg-secondary);
}

/* ── Skeleton ── */
.aw-skeleton {
  background: var(--aw-bg-secondary);
  border-radius: 8px;
  animation: aw-skeleton-pulse 1.5s ease-in-out infinite;
}

.aw-skeleton-card {
  border: 1px solid var(--aw-border);
  border-radius: var(--aw-radius);
  overflow: hidden;
}

.aw-skeleton-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--aw-bg-secondary);
  animation: aw-skeleton-pulse 1.5s ease-in-out infinite;
}

.aw-skeleton-body {
  padding: 16px;
}

.aw-skeleton-line {
  height: 14px;
  background: var(--aw-bg-secondary);
  border-radius: 4px;
  margin-bottom: 8px;
  animation: aw-skeleton-pulse 1.5s ease-in-out infinite;
}

.aw-skeleton-line--short { width: 60%; }
.aw-skeleton-line--medium { width: 80%; }
.aw-skeleton-line--long { width: 100%; }
.aw-skeleton-line--title { height: 20px; width: 70%; margin-bottom: 12px; }
`;
