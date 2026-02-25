import { h } from '../dom/create-element';
import { icons } from '../dom/icons';

export interface InputAreaOptions {
  onSend: (text: string) => void;
}

export class InputArea {
  readonly el: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private disabled = false;

  constructor(opts: InputAreaOptions) {
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'aw-textarea';
    this.textarea.placeholder = 'Type a message...';
    this.textarea.rows = 1;
    this.textarea.setAttribute('aria-label', 'Message input');

    this.sendBtn = h('button', {
      class: 'aw-send-btn',
      'aria-label': 'Send message',
      disabled: true,
    }, [icons.send()]) as HTMLButtonElement;

    // Auto-expand textarea
    this.textarea.addEventListener('input', () => {
      this.autoResize();
      this.sendBtn.disabled = this.disabled || !this.textarea.value.trim();
    });

    // Enter to send, Shift+Enter for newline
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submit(opts.onSend);
      }
    });

    this.sendBtn.addEventListener('click', () => {
      this.submit(opts.onSend);
    });

    this.el = h('div', { class: 'aw-input-area' }, [
      this.textarea,
      this.sendBtn,
    ]);
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.textarea.disabled = disabled;
    this.sendBtn.disabled = disabled || !this.textarea.value.trim();
  }

  focus(): void {
    this.textarea.focus();
  }

  clear(): void {
    this.textarea.value = '';
    this.autoResize();
    this.sendBtn.disabled = true;
  }

  private submit(onSend: (text: string) => void): void {
    const text = this.textarea.value.trim();
    if (!text || this.disabled) return;
    onSend(text);
    this.clear();
  }

  private autoResize(): void {
    this.textarea.style.height = 'auto';
    const maxHeight = 120; // ~5 rows
    this.textarea.style.height = Math.min(this.textarea.scrollHeight, maxHeight) + 'px';
  }
}
