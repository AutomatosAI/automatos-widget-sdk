export const baseCSS = /* css */ `
/* ── Reset ── */
:host {
  all: initial;
  font-family: var(--aw-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: 14px;
  line-height: 1.5;
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

.aw-root {
  position: fixed;
  z-index: 2147483647;
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
  --aw-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  --aw-radius: 16px;
  --aw-user-bg: var(--aw-primary);
  --aw-user-text: #ffffff;
  --aw-assistant-bg: var(--aw-bg-secondary);
  --aw-assistant-text: var(--aw-text);
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
  --aw-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --aw-radius: 16px;
  --aw-user-bg: var(--aw-primary);
  --aw-user-text: #ffffff;
  --aw-assistant-bg: var(--aw-bg-secondary);
  --aw-assistant-text: var(--aw-text);
  --aw-code-bg: #1e1e3a;
  --aw-code-text: #d4d4d4;
}

/* ── Position ── */
:host([data-position="bottom-right"]) .aw-root {
  right: 20px;
  bottom: 20px;
}

:host([data-position="bottom-left"]) .aw-root {
  left: 20px;
  bottom: 20px;
}
`;
