import type { WidgetMessage } from '@automatos/core';
import { h } from '../dom/create-element';
import { icons } from '../dom/icons';
import { renderMarkdown } from '../markdown/parser';

export function createMessageBubble(msg: WidgetMessage): HTMLElement {
  const roleClass =
    msg.status === 'error'
      ? 'aw-bubble-error'
      : msg.role === 'user'
        ? 'aw-bubble-user'
        : 'aw-bubble-assistant';

  const contentEl = h('div', { class: 'aw-bubble-content' });

  if (msg.role === 'user') {
    contentEl.appendChild(document.createTextNode(msg.content));
  } else {
    renderMarkdownInto(contentEl, msg.content);
  }

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeEl = h('div', { class: 'aw-bubble-time' }, [timeStr]);

  const bubble = h('div', {
    class: `aw-bubble ${roleClass}`,
    'data-message-id': msg.id,
  }, [contentEl, timeEl]);

  return bubble;
}

export function updateBubbleContent(bubble: HTMLElement, content: string): void {
  const contentEl = bubble.querySelector('.aw-bubble-content');
  if (!contentEl) return;

  // Clear and re-render
  while (contentEl.firstChild) {
    contentEl.removeChild(contentEl.firstChild);
  }
  renderMarkdownInto(contentEl as HTMLElement, content);
}

export function finalizeBubble(bubble: HTMLElement): void {
  bubble.classList.remove('aw-bubble-error');
  // Add copy buttons to code blocks
  const codeBlocks = bubble.querySelectorAll('pre');
  for (const pre of codeBlocks) {
    if (pre.querySelector('.aw-code-copy')) continue;
    const copyBtn = h('button', {
      class: 'aw-code-copy',
      'aria-label': 'Copy code',
      onClick: () => {
        const code = pre.querySelector('code')?.textContent ?? '';
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.replaceChildren(icons.check());
          setTimeout(() => copyBtn.replaceChildren(icons.copy()), 2000);
        });
      },
    }, [icons.copy()]);
    pre.style.position = 'relative';
    pre.appendChild(copyBtn);
  }
}

function renderMarkdownInto(container: HTMLElement, content: string): void {
  if (!content) return;
  const nodes = renderMarkdown(content);
  for (const node of nodes) {
    container.appendChild(node);
  }
}
