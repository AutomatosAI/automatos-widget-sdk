import { afterEach, describe, expect, it, vi } from 'vitest';

import { CallbackForm, type CallbackFormOptions } from '../callback/callback-form';


function makeFetchOk(body: object, status = 202): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

function makeFetchErr(detail: string, status: number, retryAfter?: string): typeof fetch {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (retryAfter) headers['Retry-After'] = retryAfter;
  return vi.fn(async () =>
    new Response(JSON.stringify({ detail }), { status, headers }),
  ) as unknown as typeof fetch;
}

const baseOpts = (overrides: Partial<CallbackFormOptions> = {}): CallbackFormOptions => ({
  baseUrl: 'https://api.test',
  apiKey: 'ak_pub_xxx',
  session_id: 'sess_abc',
  ...overrides,
});

let form: CallbackForm;

afterEach(() => {
  form?.unmount();
  document.body.replaceChildren();
});


// ---------------------------------------------------------------------------
// Mounting + structure
// ---------------------------------------------------------------------------

describe('CallbackForm mount/unmount', () => {
  it('attaches a host element with shadow root', () => {
    form = new CallbackForm(baseOpts());
    form.mount();
    const host = document.querySelector('aw-callback-form');
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    expect(form.isMounted()).toBe(true);
  });

  it('mount is idempotent', () => {
    form = new CallbackForm(baseOpts());
    form.mount();
    form.mount();
    expect(document.querySelectorAll('aw-callback-form').length).toBe(1);
  });

  it('unmount removes the host', () => {
    form = new CallbackForm(baseOpts());
    form.mount();
    form.unmount();
    expect(document.querySelector('aw-callback-form')).toBeNull();
    expect(form.isMounted()).toBe(false);
  });

  it('renders heading override when provided', () => {
    form = new CallbackForm(baseOpts({ heading: 'Need help with this product?' }));
    form.mount();
    const root = document.querySelector('aw-callback-form')?.shadowRoot;
    expect(root?.querySelector('.title')?.textContent).toBe('Need help with this product?');
  });

  it('falls back to default heading', () => {
    form = new CallbackForm(baseOpts());
    form.mount();
    const root = document.querySelector('aw-callback-form')?.shadowRoot;
    expect(root?.querySelector('.title')?.textContent).toBe('Request a callback');
  });
});


// ---------------------------------------------------------------------------
// Validation (client-side)
// ---------------------------------------------------------------------------

describe('CallbackForm validation', () => {
  it('rejects empty name', async () => {
    form = new CallbackForm(baseOpts({ fetchImpl: makeFetchOk({}) }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    const phoneInput = root.querySelector('#aw-cb-phone') as HTMLInputElement;
    phoneInput.value = '+447700900123';
    phoneInput.dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await Promise.resolve();
    expect(form.getErrorForTest()).toContain('name');
    expect(form.getStateForTest()).toBe('editing');
  });

  it('rejects invalid phone (no country code)', async () => {
    form = new CallbackForm(baseOpts({ fetchImpl: makeFetchOk({}) }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('#aw-cb-name') as HTMLInputElement).value = 'James';
    (root.querySelector('#aw-cb-name') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).value = '07700900123';
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await Promise.resolve();
    expect(form.getErrorForTest().toLowerCase()).toContain('international');
    expect(form.getStateForTest()).toBe('editing');
  });

  it('strips dashes/spaces from phone before validating', async () => {
    const fetchImpl = makeFetchOk({
      accepted: true, request_id: 'cb_x', eta_phrase: 'thanks',
    });
    form = new CallbackForm(baseOpts({ fetchImpl }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('#aw-cb-name') as HTMLInputElement).value = 'James';
    (root.querySelector('#aw-cb-name') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+44 7700-900 123';
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    // Allow microtasks
    await new Promise(r => setTimeout(r, 0));
    expect(form.getStateForTest()).toBe('thanks');
  });
});


// ---------------------------------------------------------------------------
// Submission flow
// ---------------------------------------------------------------------------

describe('CallbackForm submission', () => {
  it('transitions editing → submitting → thanks on success', async () => {
    const fetchImpl = makeFetchOk({
      accepted: true,
      request_id: 'cb_xyz',
      eta_phrase: "We'll aim to call you within 4 working hours.",
    });
    form = new CallbackForm(baseOpts({ fetchImpl }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('#aw-cb-name') as HTMLInputElement).value = 'James';
    (root.querySelector('#aw-cb-name') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));
    expect(form.getStateForTest()).toBe('thanks');
    const newRoot = document.querySelector('aw-callback-form')!.shadowRoot!;
    expect(newRoot.querySelector('.thanks')?.textContent).toContain('4 working hours');
  });

  it('calls onSuccess with the server payload', async () => {
    const fetchImpl = makeFetchOk({
      accepted: true, request_id: 'cb_xyz', eta_phrase: 'eta-text',
    });
    const onSuccess = vi.fn();
    form = new CallbackForm(baseOpts({ fetchImpl, onSuccess }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('#aw-cb-name') as HTMLInputElement).value = 'X';
    (root.querySelector('#aw-cb-name') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));
    expect(onSuccess).toHaveBeenCalledWith({
      request_id: 'cb_xyz', eta_phrase: 'eta-text',
    });
  });

  it('shows server error detail on 400', async () => {
    const fetchImpl = makeFetchErr('phone must be in E.164 format', 400);
    form = new CallbackForm(baseOpts({ fetchImpl }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('#aw-cb-name') as HTMLInputElement).value = 'X';
    (root.querySelector('#aw-cb-name') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));
    expect(form.getStateForTest()).toBe('editing');
    expect(form.getErrorForTest()).toContain('E.164');
  });

  it('shows friendly retry-after message on 429', async () => {
    const fetchImpl = makeFetchErr('per_session_cooldown', 429, '60');
    form = new CallbackForm(baseOpts({ fetchImpl }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('#aw-cb-name') as HTMLInputElement).value = 'X';
    (root.querySelector('#aw-cb-name') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));
    expect(form.getErrorForTest()).toContain('60s');
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    form = new CallbackForm(baseOpts({ onDismiss }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('.close') as HTMLButtonElement).click();
    expect(onDismiss).toHaveBeenCalled();
    expect(form.isMounted()).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// XSS — server eta_phrase + heading must NOT inject
// ---------------------------------------------------------------------------

describe('CallbackForm XSS resistance', () => {
  it('renders eta_phrase via textContent (not innerHTML)', async () => {
    const evil = '<img src=x onerror="window.__pwned = true">';
    const fetchImpl = makeFetchOk({
      accepted: true, request_id: 'cb_x', eta_phrase: evil,
    });
    form = new CallbackForm(baseOpts({ fetchImpl }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    (root.querySelector('#aw-cb-name') as HTMLInputElement).value = 'X';
    (root.querySelector('#aw-cb-name') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).value = '+447700900123';
    (root.querySelector('#aw-cb-phone') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    const newRoot = document.querySelector('aw-callback-form')!.shadowRoot!;
    expect(newRoot.querySelector('img')).toBeNull();
    expect(newRoot.querySelector('.thanks')?.textContent).toBe(evil);
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it('renders heading via textContent', () => {
    const evil = '<script>window.__pwned2 = true</script>';
    form = new CallbackForm(baseOpts({ heading: evil }));
    form.mount();
    const root = document.querySelector('aw-callback-form')!.shadowRoot!;
    expect(root.querySelector('script')).toBeNull();
    expect(root.querySelector('.title')?.textContent).toBe(evil);
    expect((window as unknown as { __pwned2?: boolean }).__pwned2).toBeUndefined();
  });
});
