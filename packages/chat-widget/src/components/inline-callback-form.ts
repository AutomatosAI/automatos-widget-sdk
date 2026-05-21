/**
 * Inline callback form rendered as a chat message bubble (PRD-008-A.3).
 *
 * Replaces the popup form for chat-triggered callbacks. Lives inside the
 * scrollback, no z-index battles, no context switch. Shopper sees:
 *
 *   Agent: "Sure — just need two quick details:"
 *   ┌──────────────────────────────────────┐
 *   │ Name      [_________________]        │
 *   │ Phone     [+44…              ]       │
 *   │           [   Request callback   ]   │
 *   └──────────────────────────────────────┘
 *
 * On submit → form bubble replaced with success state showing eta_phrase.
 * On error → form stays editable, inline error message shown.
 *
 * Submit logic reuses the same submitCallback helper as the standalone
 * popup form (moved to @automatos/core in PRD-008-A.3) so both UIs hit
 * the same API contract with identical validation + retry behaviour.
 */

import { submitCallback } from '@automatos/core';

// E.164 validation mirrored from the orchestrator + the popup form.
// Keep in sync with services/callback.py::PHONE_E164_REGEX.
const PHONE_E164 = /^\+[1-9]\d{7,14}$/;

export interface InlineCallbackFormOptions {
  baseUrl: string;
  apiKey: string;
  session_id: string;
  product_context?: string;
  primaryColor?: string;
  /** Heading text shown above the form. Defaults to a context-aware string. */
  heading?: string;
  onSuccess?: (result: { request_id: string; eta_phrase: string }) => void;
}

/**
 * Build the form bubble element. Renders into a host container (typically
 * the MessageList) and manages its own state machine: editing → submitting
 * → done/error.
 */
export function createInlineCallbackForm(
  opts: InlineCallbackFormOptions,
): HTMLElement {
  const accent = opts.primaryColor || '#6366f1';
  const heading =
    opts.heading ||
    (opts.product_context
      ? `Sure — just need two quick details about ${opts.product_context}:`
      : `Sure — just need two quick details:`);

  // Bubble wrapper — matches the existing aw-bubble-assistant styling so it
  // visually reads as part of the conversation.
  const bubble = document.createElement('div');
  bubble.className = 'aw-bubble aw-bubble-assistant aw-bubble-form';
  bubble.setAttribute('role', 'group');
  bubble.setAttribute('aria-label', 'Callback request form');

  // ── Heading ──
  const headingEl = document.createElement('div');
  headingEl.className = 'aw-form-heading';
  headingEl.textContent = heading;
  bubble.appendChild(headingEl);

  // ── Name field ──
  const nameField = document.createElement('div');
  nameField.className = 'aw-form-field';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Name';
  nameLabel.setAttribute('for', 'aw-cb-name');
  const nameInput = document.createElement('input');
  nameInput.id = 'aw-cb-name';
  nameInput.type = 'text';
  nameInput.autocomplete = 'name';
  nameInput.required = true;
  nameInput.maxLength = 100;
  nameField.appendChild(nameLabel);
  nameField.appendChild(nameInput);
  bubble.appendChild(nameField);

  // ── Phone field ──
  const phoneField = document.createElement('div');
  phoneField.className = 'aw-form-field';
  const phoneLabel = document.createElement('label');
  phoneLabel.textContent = 'Phone (include country code, e.g. +44…)';
  phoneLabel.setAttribute('for', 'aw-cb-phone');
  const phoneInput = document.createElement('input');
  phoneInput.id = 'aw-cb-phone';
  phoneInput.type = 'tel';
  phoneInput.autocomplete = 'tel';
  phoneInput.required = true;
  phoneInput.placeholder = '+44…';
  phoneInput.inputMode = 'tel';
  phoneField.appendChild(phoneLabel);
  phoneField.appendChild(phoneInput);
  bubble.appendChild(phoneField);

  // ── Error line ──
  const errorEl = document.createElement('div');
  errorEl.className = 'aw-form-error';
  errorEl.setAttribute('role', 'alert');
  errorEl.setAttribute('aria-live', 'polite');
  bubble.appendChild(errorEl);

  // ── Submit button ──
  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'aw-form-submit';
  submitBtn.textContent = 'Request callback';
  submitBtn.style.backgroundColor = accent;
  bubble.appendChild(submitBtn);

  // ── State machine ──
  let submitting = false;
  let done = false;

  function setError(message: string) {
    errorEl.textContent = message;
  }
  function clearError() {
    errorEl.textContent = '';
  }
  function setSubmitting(value: boolean) {
    submitting = value;
    submitBtn.disabled = value;
    nameInput.disabled = value;
    phoneInput.disabled = value;
    submitBtn.textContent = value ? 'Sending…' : 'Request callback';
  }
  function renderSuccess(etaPhrase: string) {
    done = true;
    // Replace the form contents with a success message; the bubble stays
    // in the scrollback so the shopper has a record of what they did.
    bubble.replaceChildren();
    const checkmark = document.createElement('div');
    checkmark.className = 'aw-form-success-icon';
    checkmark.textContent = '✓';
    const successText = document.createElement('div');
    successText.className = 'aw-form-success-text';
    successText.textContent = etaPhrase;
    bubble.appendChild(checkmark);
    bubble.appendChild(successText);
    bubble.classList.add('aw-bubble-form-done');
  }

  // ── Submit handler ──
  async function handleSubmit() {
    if (submitting || done) return;
    clearError();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) {
      setError('Please enter your name.');
      nameInput.focus();
      return;
    }
    if (!PHONE_E164.test(phone)) {
      setError('Please enter a phone number including the country code (e.g. +447700900123).');
      phoneInput.focus();
      return;
    }

    setSubmitting(true);
    const result = await submitCallback({
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      session_id: opts.session_id,
      name,
      phone,
      product_context: opts.product_context,
    });
    setSubmitting(false);

    if (result.ok) {
      opts.onSuccess?.({ request_id: result.request_id, eta_phrase: result.eta_phrase });
      renderSuccess(result.eta_phrase);
    } else {
      if (result.status === 429 && result.retryAfterSeconds) {
        setError(`Too many requests. Please wait ${result.retryAfterSeconds}s and try again.`);
      } else {
        setError(result.message || 'Something went wrong. Please try again.');
      }
    }
  }

  submitBtn.addEventListener('click', handleSubmit);
  phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') phoneInput.focus();
  });

  // Focus the first empty field on mount.
  requestAnimationFrame(() => nameInput.focus());

  return bubble;
}
