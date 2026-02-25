import type { WidgetMessage } from '@automatos/core';
import { createMessageBubble, updateBubbleContent, finalizeBubble } from './message-bubble';

export class MessageList {
  private container: HTMLElement;
  private bubbleMap = new Map<string, HTMLElement>();
  private shouldAutoScroll = true;

  constructor(container: HTMLElement) {
    this.container = container;

    // Track scroll position — only auto-scroll if user is near bottom
    this.container.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.container;
      this.shouldAutoScroll = scrollHeight - scrollTop - clientHeight < 80;
    });
  }

  addMessage(msg: WidgetMessage): HTMLElement {
    const bubble = createMessageBubble(msg);
    this.bubbleMap.set(msg.id, bubble);
    this.container.appendChild(bubble);
    this.scrollToBottom();
    return bubble;
  }

  updateStreamingMessage(messageId: string, content: string): void {
    const bubble = this.bubbleMap.get(messageId);
    if (bubble) {
      updateBubbleContent(bubble, content);
      this.scrollToBottom();
    }
  }

  finalizeMessage(messageId: string): void {
    const bubble = this.bubbleMap.get(messageId);
    if (bubble) {
      finalizeBubble(bubble);
    }
  }

  markError(messageId: string, errorContent?: string): void {
    const bubble = this.bubbleMap.get(messageId);
    if (bubble) {
      bubble.classList.remove('aw-bubble-assistant');
      bubble.classList.add('aw-bubble-error');
      if (errorContent) {
        updateBubbleContent(bubble, errorContent);
      }
    }
  }

  showTyping(): HTMLElement {
    const typing = document.createElement('div');
    typing.className = 'aw-typing';
    typing.setAttribute('aria-label', 'Assistant is typing');
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'aw-typing-dot';
      typing.appendChild(dot);
    }
    this.container.appendChild(typing);
    this.scrollToBottom();
    return typing;
  }

  removeTyping(el: HTMLElement): void {
    el.remove();
  }

  private scrollToBottom(): void {
    if (this.shouldAutoScroll) {
      requestAnimationFrame(() => {
        this.container.scrollTop = this.container.scrollHeight;
      });
    }
  }
}
