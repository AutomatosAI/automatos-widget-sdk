/**
 * PRD-008-A.3 — Inline callback form (rendered as a chat message bubble).
 *
 * Validates DOM structure, validation, submit flow, success-state render,
 * and error paths. Same API contract as the popup form, different render
 * surface (lives inside the chat scrollback, no Shadow DOM).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInlineCallbackForm } from '@automatos/chat-widget';

function makeFetchOk(body: object, status = 202): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

function makeFetchError(detail: string, status: number): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ detail }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

const baseOpts = {
  baseUrl: 'https://api.example.test',
  apiKey: 'ak_pub_test',
  session_id: 'sess_test',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createInlineCallbackForm', () => {
  it('renders name + phone fields plus a submit button', () => {
    const el = createInlineCallbackForm({ ...baseOpts });
    document.body.appendChild(el);

    expect(el.querySelector<HTMLInputElement>('#aw-cb-name')).toBeTruthy();
    expect(el.querySelector<HTMLInputElement>('#aw-cb-phone')).toBeTruthy();
    expect(el.querySelector<HTMLButtonElement>('.aw-form-submit')?.textContent)
      .toBe('Request callback');

    el.remove();
  });

  it('uses product_context in the heading when provided', () => {
    const el = createInlineCallbackForm({
      ...baseOpts,
      product_context: 'EN 12101 Control Panel',
    });
    expect(el.querySelector('.aw-form-heading')?.textContent)
      .toContain('EN 12101 Control Panel');
  });

  it('uses a custom heading override when supplied', () => {
    const el = createInlineCallbackForm({
      ...baseOpts,
      heading: 'Drop your number, our team will ring you:',
    });
    expect(el.querySelector('.aw-form-heading')?.textContent)
      .toBe('Drop your number, our team will ring you:');
  });

  it('renders heading as text (no innerHTML XSS)', () => {
    const el = createInlineCallbackForm({
      ...baseOpts,
      heading: '<img src=x onerror="alert(1)">',
    });
    // Should render as literal text, not as a real <img> element
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.aw-form-heading')?.textContent)
      .toContain('<img src=x');
  });

  it('flags an empty name on submit', () => {
    const fetchImpl = makeFetchOk({ request_id: 'cb_x', eta_phrase: 'soon' });
    vi.stubGlobal('fetch', fetchImpl);
    const el = createInlineCallbackForm({ ...baseOpts });
    document.body.appendChild(el);

    const phoneInput = el.querySelector<HTMLInputElement>('#aw-cb-phone')!;
    phoneInput.value = '+447700900123';
    el.querySelector<HTMLButtonElement>('.aw-form-submit')!.click();

    expect(el.querySelector('.aw-form-error')?.textContent).toContain('name');
    expect(fetchImpl).not.toHaveBeenCalled();
    el.remove();
  });

  it('flags a non-E.164 phone on submit', () => {
    const fetchImpl = makeFetchOk({ request_id: 'cb_x', eta_phrase: 'soon' });
    vi.stubGlobal('fetch', fetchImpl);
    const el = createInlineCallbackForm({ ...baseOpts });
    document.body.appendChild(el);

    (el.querySelector('#aw-cb-name') as HTMLInputElement).value = 'Test';
    (el.querySelector('#aw-cb-phone') as HTMLInputElement).value = '07700900123';
    el.querySelector<HTMLButtonElement>('.aw-form-submit')!.click();

    expect(el.querySelector('.aw-form-error')?.textContent).toMatch(/country code/i);
    expect(fetchImpl).not.toHaveBeenCalled();
    el.remove();
  });

  it('renders success state with eta_phrase after a 202', async () => {
    const fetchImpl = makeFetchOk({
      request_id: 'cb_abc',
      eta_phrase: 'We will call you within 4 hours.',
    });
    vi.stubGlobal('fetch', fetchImpl);

    const onSuccess = vi.fn();
    const el = createInlineCallbackForm({ ...baseOpts, onSuccess });
    document.body.appendChild(el);

    (el.querySelector('#aw-cb-name') as HTMLInputElement).value = 'Test';
    (el.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    el.querySelector<HTMLButtonElement>('.aw-form-submit')!.click();

    // Let the async submit complete
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(onSuccess).toHaveBeenCalledWith({
      request_id: 'cb_abc',
      eta_phrase: 'We will call you within 4 hours.',
    });
    expect(el.querySelector('.aw-form-success-text')?.textContent)
      .toBe('We will call you within 4 hours.');
    expect(el.classList.contains('aw-bubble-form-done')).toBe(true);
    expect(el.querySelector('#aw-cb-name')).toBeNull(); // form fields removed
    el.remove();
  });

  it('shows an inline error on 429 with Retry-After', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ detail: 'rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      }),
    ) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchImpl);

    const el = createInlineCallbackForm({ ...baseOpts });
    document.body.appendChild(el);

    (el.querySelector('#aw-cb-name') as HTMLInputElement).value = 'Test';
    (el.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    el.querySelector<HTMLButtonElement>('.aw-form-submit')!.click();

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.querySelector('.aw-form-error')?.textContent).toMatch(/60s/);
    // Form fields still present (not in done state)
    expect(el.querySelector('#aw-cb-name')).toBeTruthy();
    el.remove();
  });

  it('surfaces server detail on 403 (feature not enabled)', async () => {
    const fetchImpl = makeFetchError('Callback feature not enabled for this Site.', 403);
    vi.stubGlobal('fetch', fetchImpl);

    const el = createInlineCallbackForm({ ...baseOpts });
    document.body.appendChild(el);

    (el.querySelector('#aw-cb-name') as HTMLInputElement).value = 'Test';
    (el.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    el.querySelector<HTMLButtonElement>('.aw-form-submit')!.click();

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.querySelector('.aw-form-error')?.textContent)
      .toContain('not enabled');
    el.remove();
  });
});
