export const componentCSS = /* css */ `
/* ── FAB ── */
.aw-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--aw-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  outline: none;
}

.aw-fab:hover {
  background: var(--aw-primary-hover);
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.aw-fab:focus-visible {
  outline: 2px solid var(--aw-primary);
  outline-offset: 3px;
}

.aw-fab svg {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.aw-fab[data-open="true"] svg:first-child {
  transform: rotate(90deg) scale(0);
  opacity: 0;
  position: absolute;
}

.aw-fab[data-open="true"] svg:last-child {
  transform: rotate(0deg) scale(1);
  opacity: 1;
}

.aw-fab[data-open="false"] svg:first-child {
  transform: rotate(0deg) scale(1);
  opacity: 1;
}

.aw-fab[data-open="false"] svg:last-child {
  transform: rotate(-90deg) scale(0);
  opacity: 0;
  position: absolute;
}

.aw-fab-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff3b30;
  border: 2px solid var(--aw-bg);
  display: none;
}

.aw-fab-badge.visible {
  display: block;
  animation: aw-pulse 1.5s ease infinite;
}

/* ── Panel ── */
.aw-panel {
  position: absolute;
  bottom: 72px;
  width: 380px;
  max-height: 600px;
  background: var(--aw-bg);
  border-radius: var(--aw-radius);
  box-shadow: var(--aw-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: bottom right;
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1),
              opacity 0.2s ease;
}

:host([data-position="bottom-right"]) .aw-panel {
  right: 0;
  transform-origin: bottom right;
}

:host([data-position="bottom-left"]) .aw-panel {
  left: 0;
  transform-origin: bottom left;
}

.aw-panel[data-state="closed"] {
  transform: scale(0.9);
  opacity: 0;
  pointer-events: none;
}

.aw-panel[data-state="open"] {
  transform: scale(1);
  opacity: 1;
}

/* ── Header ── */
.aw-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--aw-border);
  background: var(--aw-bg);
  min-height: 56px;
}

.aw-header-logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--aw-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 14px;
  margin-right: 10px;
  flex-shrink: 0;
}

.aw-header-title {
  font-size: 15px;
  font-weight: 600;
  flex: 1;
  color: var(--aw-text);
}

.aw-header-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--aw-text-secondary);
  transition: background 0.15s ease;
}

.aw-header-close:hover {
  background: var(--aw-bg-secondary);
}

.aw-header-close:focus-visible {
  outline: 2px solid var(--aw-primary);
  outline-offset: -2px;
}

.aw-header-close svg {
  width: 18px;
  height: 18px;
}

/* ── Messages ── */
.aw-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  max-height: 420px;
  scroll-behavior: smooth;
}

.aw-messages::-webkit-scrollbar {
  width: 6px;
}

.aw-messages::-webkit-scrollbar-thumb {
  background: var(--aw-border);
  border-radius: 3px;
}

.aw-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  position: relative;
  animation: aw-fade-in 0.2s ease;
}

.aw-bubble-user {
  align-self: flex-end;
  background: var(--aw-user-bg);
  color: var(--aw-user-text);
  border-bottom-right-radius: 4px;
}

.aw-bubble-assistant {
  align-self: flex-start;
  background: var(--aw-assistant-bg);
  color: var(--aw-assistant-text);
  border-bottom-left-radius: 4px;
}

.aw-bubble-error {
  align-self: flex-start;
  background: #fff0f0;
  color: #cc0000;
  border: 1px solid #ffcccc;
  border-bottom-left-radius: 4px;
}

:host([data-theme="dark"]) .aw-bubble-error {
  background: #2a1a1a;
  color: #ff6b6b;
  border-color: #3a2020;
}

.aw-bubble-content {
  font-size: 14px;
  line-height: 1.5;
}

.aw-bubble-content p {
  margin-bottom: 8px;
}

.aw-bubble-content p:last-child {
  margin-bottom: 0;
}

.aw-bubble-content strong {
  font-weight: 600;
}

.aw-bubble-content em {
  font-style: italic;
}

.aw-bubble-content a {
  color: var(--aw-primary);
  text-decoration: underline;
}

.aw-bubble-content code {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  background: var(--aw-code-bg);
  color: var(--aw-code-text);
  padding: 2px 5px;
  border-radius: 4px;
}

.aw-bubble-content pre {
  background: var(--aw-code-bg);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 8px 0;
  position: relative;
}

.aw-bubble-content pre code {
  background: none;
  padding: 0;
  font-size: 12px;
  line-height: 1.6;
}

.aw-code-copy {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--aw-border);
  background: var(--aw-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--aw-text-secondary);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.aw-bubble-content pre:hover .aw-code-copy {
  opacity: 1;
}

.aw-bubble-content ul,
.aw-bubble-content ol {
  padding-left: 20px;
  margin: 8px 0;
}

.aw-bubble-content li {
  margin-bottom: 4px;
}

.aw-bubble-content h1,
.aw-bubble-content h2,
.aw-bubble-content h3 {
  font-weight: 600;
  margin: 12px 0 6px;
}

.aw-bubble-content h1 { font-size: 18px; }
.aw-bubble-content h2 { font-size: 16px; }
.aw-bubble-content h3 { font-size: 15px; }

.aw-bubble-time {
  font-size: 11px;
  color: var(--aw-text-secondary);
  margin-top: 4px;
  opacity: 0.7;
}

.aw-bubble-user .aw-bubble-time {
  color: rgba(255, 255, 255, 0.7);
}

/* ── Typing Indicator ── */
.aw-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 14px;
  background: var(--aw-assistant-bg);
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  align-self: flex-start;
  animation: aw-fade-in 0.2s ease;
}

.aw-typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--aw-text-secondary);
  opacity: 0.5;
  animation: aw-typing-bounce 1.2s ease-in-out infinite;
}

.aw-typing-dot:nth-child(2) { animation-delay: 0.15s; }
.aw-typing-dot:nth-child(3) { animation-delay: 0.3s; }

/* ── Input ── */
.aw-input-area {
  display: flex;
  align-items: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--aw-border);
  background: var(--aw-bg);
  gap: 8px;
}

.aw-textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--aw-border);
  border-radius: 12px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  color: var(--aw-text);
  background: var(--aw-bg);
  outline: none;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.15s ease;
}

.aw-textarea:focus {
  border-color: var(--aw-primary);
}

.aw-textarea::placeholder {
  color: var(--aw-text-secondary);
}

.aw-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.aw-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: var(--aw-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.aw-send-btn:hover:not(:disabled) {
  background: var(--aw-primary-hover);
}

.aw-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.aw-send-btn:focus-visible {
  outline: 2px solid var(--aw-primary);
  outline-offset: 2px;
}

/* ── Error Banner ── */
.aw-error-banner {
  padding: 10px 16px;
  background: #fff0f0;
  color: #cc0000;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ffcccc;
}

:host([data-theme="dark"]) .aw-error-banner {
  background: #2a1a1a;
  color: #ff6b6b;
  border-color: #3a2020;
}

.aw-error-banner button {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

/* ── Powered By ── */
.aw-powered {
  padding: 8px 16px;
  text-align: center;
  font-size: 11px;
  color: var(--aw-text-secondary);
  opacity: 0.6;
}

.aw-powered a {
  color: inherit;
  text-decoration: none;
}

.aw-powered a:hover {
  text-decoration: underline;
}
`;
