export const baseCSS = /* css */ `
/* ── Reset ── */
:host {
  all: initial;
  display: block;
  font-family: var(--aw-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: 16px;
  line-height: 1.7;
  color: var(--aw-text, #1a1a1a);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

:host *,
:host *::before,
:host *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.aw-blog-root {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

/* ── Theme: Light ── */
:host([data-theme="light"]) {
  --aw-primary: #0066ff;
  --aw-primary-hover: #0052cc;
  --aw-bg: #ffffff;
  --aw-bg-secondary: #f5f5f5;
  --aw-text: #1a1a1a;
  --aw-text-secondary: #666666;
  --aw-border: #e5e5e5;
  --aw-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --aw-radius: 12px;
  --aw-code-bg: #f0f0f0;
  --aw-code-text: #333333;
}

/* ── Theme: Dark ── */
:host([data-theme="dark"]) {
  --aw-primary: #4d94ff;
  --aw-primary-hover: #3d84ff;
  --aw-bg: #1a1a2e;
  --aw-bg-secondary: #252540;
  --aw-text: #e5e5e5;
  --aw-text-secondary: #999999;
  --aw-border: #333355;
  --aw-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  --aw-radius: 12px;
  --aw-code-bg: #1e1e3a;
  --aw-code-text: #d4d4d4;
}

/* ── Content Typography ── */
.aw-blog-content {
  max-width: 720px;
  margin: 0 auto;
  line-height: 1.7;
}

.aw-blog-content h1 { font-size: 2em; font-weight: 700; margin: 1em 0 0.5em; }
.aw-blog-content h2 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.4em; }
.aw-blog-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.8em 0 0.3em; }
.aw-blog-content h4 { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.3em; }
.aw-blog-content h5, .aw-blog-content h6 { font-size: 1em; font-weight: 600; margin: 0.5em 0 0.2em; }
.aw-blog-content p { margin-bottom: 1em; }
.aw-blog-content a { color: var(--aw-primary); text-decoration: underline; }
.aw-blog-content a:hover { color: var(--aw-primary-hover); }
.aw-blog-content code {
  background: var(--aw-code-bg);
  color: var(--aw-code-text);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.9em;
}
.aw-blog-content pre {
  background: var(--aw-code-bg);
  color: var(--aw-code-text);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1em;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.9em;
  line-height: 1.5;
}
.aw-blog-content pre code {
  background: none;
  padding: 0;
  border-radius: 0;
}
.aw-blog-content blockquote {
  border-left: 3px solid var(--aw-primary);
  padding-left: 16px;
  margin: 1em 0;
  font-style: italic;
  color: var(--aw-text-secondary);
}
.aw-blog-content img {
  max-width: 100%;
  border-radius: 8px;
  margin: 1em 0;
}
.aw-blog-content ul, .aw-blog-content ol {
  padding-left: 24px;
  margin-bottom: 1em;
}
.aw-blog-content li { margin-bottom: 0.3em; }
.aw-blog-content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
}
.aw-blog-content th, .aw-blog-content td {
  border: 1px solid var(--aw-border);
  padding: 8px 12px;
  text-align: left;
}
.aw-blog-content tr:nth-child(even) { background: var(--aw-bg-secondary); }
.aw-blog-content hr {
  border: none;
  border-top: 1px solid var(--aw-border);
  margin: 2em 0;
}
`;
