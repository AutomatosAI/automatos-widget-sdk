/**
 * CallbackForm (PRD-008-A Feature B).
 *
 * Shadow-DOM phone-capture form. Self-contained: own styles, no
 * theme leakage. State machine: editing → submitting → thanks (or
 * editing again on validation error).
 *
 * Built with createElement + textContent (no innerHTML) so user-
 * supplied strings (eta_phrase from server, merchant heading
 * override) cannot inject markup. Matches the safe-DOM pattern
 * used by ProactivePopup.
 */

import { submitCallback, type CallbackSubmitResult } from './submit';

export interface CallbackFormOptions {
  baseUrl: string;
  apiKey: string;
  session_id: string;
  product_context?: string;
  /** Form heading override (PRD-008-A WidgetCallbackConfig.form_heading). */
  heading?: string;
  /** Theme accent for primary button. */
  primaryColor?: string;
  /** Called on successful submit with the server's eta_phrase. */
  onSuccess?: (result: { request_id: string; eta_phrase: string }) => void;
  /** Called when the user dismisses (X / Cancel / Esc). */
  onDismiss?: () => void;
  /** Override fetch for tests. */
  fetchImpl?: typeof fetch;
  /** Override Document for tests (jsdom). */
  doc?: Document;
}

// E.164 validation mirrored from the orchestrator.
// Keep in sync with services/callback.py::PHONE_E164_REGEX.
const PHONE_E164 = /^\+[1-9]\d{7,14}$/;

const STYLES = `
  :host {
    position: fixed;
    z-index: 2147483647;
    bottom: 24px;
    right: 24px;
    width: 320px;
    max-width: calc(100vw - 32px);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --aw-cb-bg: #ffffff;
    --aw-cb-text: #1a1a1a;
    --aw-cb-muted: #6b7280;
    --aw-cb-border: rgba(0,0,0,0.08);
    --aw-cb-error: #dc2626;
    --aw-cb-shadow: 0 10px 32px rgba(0,0,0,0.14);
    --aw-cb-radius: 14px;
    --aw-cb-accent: #6366f1;
  }
  .panel {
    background: var(--aw-cb-bg);
    color: var(--aw-cb-text);
    border-radius: var(--aw-cb-radius);
    border: 1px solid var(--aw-cb-border);
    box-shadow: var(--aw-cb-shadow);
    padding: 18px 18px 14px 18px;
    animation: slide-in 0.18s ease-out;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .title { font-weight: 600; font-size: 15px; margin: 0; }
  .close {
    background: none; border: 0; cursor: pointer; padding: 4px;
    color: var(--aw-cb-muted); font-size: 18px; line-height: 1;
  }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  .field label { font-size: 12px; color: var(--aw-cb-muted); }
  .field input {
    box-sizing: border-box; width: 100%; padding: 8px 10px;
    border: 1px solid var(--aw-cb-border); border-radius: 8px;
    font-size: 14px; color: var(--aw-cb-text); font-family: inherit;
  }
  .field input:focus {
    outline: none; border-color: var(--aw-cb-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--aw-cb-accent) 18%, transparent);
  }
  .error {
    color: var(--aw-cb-error); font-size: 12px;
    margin-top: 8px; min-height: 14px;
  }
  .submit {
    width: 100%; padding: 10px 14px;
    background: var(--aw-cb-accent); color: white;
    border: 0; border-radius: 8px;
    font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px;
  }
  .submit[disabled] { opacity: 0.6; cursor: wait; }
  .thanks { padding: 6px 0 4px 0; color: var(--aw-cb-text); }
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

type FormState = 'editing' | 'submitting' | 'thanks';

export class CallbackForm {
  private opts: CallbackFormOptions;
  private host: HTMLElement | null = null;
  private root: ShadowRoot | null = null;
  private state: FormState = 'editing';
  private errorText = '';
  private mounted = false;
  private successResult: { request_id: string; eta_phrase: string } | null = null;
  private nameValue = '';
  private phoneValue = '';
  private doc: Document;

  constructor(opts: CallbackFormOptions) {
    this.opts = opts;
    this.doc = opts.doc ?? document;
  }

  mount(): void {
    if (this.mounted) return;
    this.host = this.doc.createElement('aw-callback-form');
    this.root = this.host.attachShadow({ mode: 'open' });
    this.doc.body.appendChild(this.host);
    this.mounted = true;
    this.render();
  }

  isMounted(): boolean {
    return this.mounted;
  }

  unmount(): void {
    if (!this.mounted || !this.host) return;
    this.host.remove();
    this.host = null;
    this.root = null;
    this.mounted = false;
  }

  /** Test hook — read current state for assertions. */
  getStateForTest(): FormState {
    return this.state;
  }

  /** Test hook — read current error message for assertions. */
  getErrorForTest(): string {
    return this.errorText;
  }

  private render(): void {
    if (!this.root) return;

    const accent = this.opts.primaryColor ?? '#6366f1';
    const heading = this.opts.heading ?? 'Request a callback';

    // Wipe + reattach styles. Stylesheets via <style> elements with
    // textContent are safe — only the CSS string is interpolated, and
    // accent + STYLES are entirely under our control.
    this.root.replaceChildren();
    const baseStyle = this.doc.createElement('style');
    baseStyle.textContent = STYLES;
    this.root.appendChild(baseStyle);

    const accentStyle = this.doc.createElement('style');
    // accent comes from config.themeOverrides — merchant-controlled but
    // assigned to a CSS custom property only; not injected into HTML.
    accentStyle.textContent = `:host { --aw-cb-accent: ${cssEscape(accent)}; }`;
    this.root.appendChild(accentStyle);

    const panel = this.doc.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Callback request form');

    if (this.state === 'thanks' && this.successResult) {
      panel.appendChild(this.buildThanksHeader());
      const body = this.doc.createElement('div');
      body.className = 'thanks';
      body.textContent = this.successResult.eta_phrase; // safe: textContent
      panel.appendChild(body);
    } else {
      panel.appendChild(this.buildEditingHeader(heading));
      panel.appendChild(this.buildForm());
    }

    this.root.appendChild(panel);
  }

  private buildEditingHeader(heading: string): HTMLElement {
    const hdr = this.doc.createElement('div');
    hdr.className = 'header';

    const title = this.doc.createElement('p');
    title.className = 'title';
    title.textContent = heading; // safe
    hdr.appendChild(title);

    const close = this.doc.createElement('button');
    close.className = 'close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×'; // ×
    if (this.state === 'submitting') close.setAttribute('disabled', 'true');
    close.addEventListener('click', () => this.handleDismiss());
    hdr.appendChild(close);

    return hdr;
  }

  private buildThanksHeader(): HTMLElement {
    const hdr = this.doc.createElement('div');
    hdr.className = 'header';

    const title = this.doc.createElement('p');
    title.className = 'title';
    title.textContent = 'Thanks!';
    hdr.appendChild(title);

    const close = this.doc.createElement('button');
    close.className = 'close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    close.addEventListener('click', () => this.handleDismiss());
    hdr.appendChild(close);

    return hdr;
  }

  private buildForm(): HTMLElement {
    const submitting = this.state === 'submitting';

    const form = this.doc.createElement('form');
    form.appendChild(this.buildField({
      id: 'aw-cb-name',
      label: 'Your name',
      type: 'text',
      maxlength: '100',
      value: this.nameValue,
      disabled: submitting,
      onInput: (v) => { this.nameValue = v; },
    }));
    form.appendChild(this.buildField({
      id: 'aw-cb-phone',
      label: 'Phone (international format, e.g. +447700900123)',
      type: 'tel',
      maxlength: '32',
      value: this.phoneValue,
      disabled: submitting,
      inputmode: 'tel',
      onInput: (v) => { this.phoneValue = v; },
    }));

    const err = this.doc.createElement('div');
    err.className = 'error';
    err.setAttribute('role', 'alert');
    err.textContent = this.errorText; // safe
    form.appendChild(err);

    const submit = this.doc.createElement('button');
    submit.type = 'submit';
    submit.className = 'submit';
    if (submitting) submit.setAttribute('disabled', 'true');
    submit.textContent = submitting ? 'Sending…' : 'Request callback';
    form.appendChild(submit);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });

    return form;
  }

  private buildField(spec: {
    id: string;
    label: string;
    type: string;
    maxlength: string;
    value: string;
    disabled: boolean;
    inputmode?: string;
    onInput: (v: string) => void;
  }): HTMLElement {
    const field = this.doc.createElement('div');
    field.className = 'field';

    const label = this.doc.createElement('label');
    label.setAttribute('for', spec.id);
    label.textContent = spec.label; // safe
    field.appendChild(label);

    const input = this.doc.createElement('input');
    input.id = spec.id;
    input.name = spec.id.replace('aw-cb-', '');
    input.type = spec.type;
    input.required = true;
    input.maxLength = parseInt(spec.maxlength, 10);
    input.value = spec.value;
    if (spec.inputmode) input.setAttribute('inputmode', spec.inputmode);
    if (spec.disabled) input.disabled = true;
    input.addEventListener('input', () => spec.onInput(input.value));
    field.appendChild(input);

    return field;
  }

  private async handleSubmit(): Promise<void> {
    const name = this.nameValue.trim();
    const phoneRaw = this.phoneValue.trim();
    const phone = normalisePhone(phoneRaw);

    if (!name) {
      this.errorText = 'Please enter your name.';
      this.render();
      return;
    }
    if (!PHONE_E164.test(phone)) {
      this.errorText = 'Please enter a valid international phone number, e.g. +447700900123';
      this.render();
      return;
    }

    this.state = 'submitting';
    this.errorText = '';
    this.render();

    const result: CallbackSubmitResult = await submitCallback({
      baseUrl: this.opts.baseUrl,
      apiKey: this.opts.apiKey,
      session_id: this.opts.session_id,
      phone,
      name,
      product_context: this.opts.product_context,
      fetchImpl: this.opts.fetchImpl,
    });

    if (!result.ok) {
      let userMessage = result.message;
      if (result.status === 429 && result.retryAfterSeconds) {
        userMessage = `Too many requests — please try again in ${result.retryAfterSeconds}s.`;
      } else if (result.status === 503) {
        userMessage = 'Callback temporarily unavailable. Please try again shortly.';
      } else if (result.status === 0) {
        userMessage = 'Network problem — please check your connection and try again.';
      }
      this.errorText = userMessage;
      this.state = 'editing';
      this.render();
      return;
    }

    this.successResult = result;
    this.state = 'thanks';
    this.render();
    this.opts.onSuccess?.({
      request_id: result.request_id,
      eta_phrase: result.eta_phrase,
    });
  }

  private handleDismiss(): void {
    this.unmount();
    this.opts.onDismiss?.();
  }
}


// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function normalisePhone(raw: string): string {
  // Mirror services/callback.py::normalise_phone — keep '+' and digits.
  let out = '';
  for (const ch of raw) {
    if (/\d/.test(ch) || ch === '+') out += ch;
  }
  return out;
}

/** Strip anything CSS-unsafe from the merchant-supplied accent value
 *  before injecting it into a CSS custom property. Defence-in-depth —
 *  the accent comes from config.themeOverrides which merchants control. */
function cssEscape(value: string): string {
  return value.replace(/[^0-9a-zA-Z#(),.%\s-]/g, '');
}
