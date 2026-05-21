import { describe, expect, it, vi } from 'vitest';

import { submitCallback } from '../callback/submit';


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


describe('submitCallback', () => {
  const baseInput = {
    baseUrl: 'https://api.test',
    apiKey: 'ak_pub_xxx',
    session_id: 'sess_abc',
    phone: '+447700900123',
    name: 'James',
  };

  it('returns ok on 202 with request_id + eta_phrase', async () => {
    const fetchImpl = makeFetchOk({
      accepted: true,
      request_id: 'cb_xyz',
      eta_phrase: "We'll aim to call you within 4 working hours.",
    });
    const result = await submitCallback({ ...baseInput, fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request_id).toBe('cb_xyz');
      expect(result.eta_phrase).toContain('4 working hours');
    }
  });

  it('strips trailing slash from baseUrl', async () => {
    const captured: { url?: string } = {};
    const fetchImpl = vi.fn(async (url) => {
      captured.url = String(url);
      return new Response(JSON.stringify({ accepted: true, request_id: 'x', eta_phrase: 'y' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    await submitCallback({ ...baseInput, baseUrl: 'https://api.test/', fetchImpl });
    expect(captured.url).toBe('https://api.test/api/widgets/callback');
  });

  it('sends Bearer auth header + JSON body', async () => {
    const captured: { headers?: HeadersInit; body?: string } = {};
    const fetchImpl = vi.fn(async (_url, init) => {
      captured.headers = init?.headers;
      captured.body = init?.body as string;
      return new Response(JSON.stringify({ accepted: true, request_id: 'x', eta_phrase: 'y' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    await submitCallback({
      ...baseInput,
      product_context: 'EN 12101 panel',
      fetchImpl,
    });
    const headers = captured.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer ak_pub_xxx');
    expect(headers['Content-Type']).toBe('application/json');
    const parsed = JSON.parse(captured.body!);
    expect(parsed.session_id).toBe('sess_abc');
    expect(parsed.phone).toBe('+447700900123');
    expect(parsed.product_context).toBe('EN 12101 panel');
  });

  it('returns failure with detail on 400', async () => {
    const fetchImpl = makeFetchErr('phone must be in E.164 format', 400);
    const result = await submitCallback({ ...baseInput, fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.message).toContain('E.164');
    }
  });

  it('returns failure with retryAfterSeconds on 429', async () => {
    const fetchImpl = makeFetchErr('per_session_cooldown', 429, '60');
    const result = await submitCallback({ ...baseInput, fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.retryAfterSeconds).toBe(60);
    }
  });

  it('returns failure on network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('network failed');
    }) as unknown as typeof fetch;
    const result = await submitCallback({ ...baseInput, fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(0);
      expect(result.message).toContain('network failed');
    }
  });

  it('aborts after timeoutMs', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      // Resolve when aborted; mimic real fetch behaviour.
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }) as unknown as typeof fetch;
    const result = await submitCallback({
      ...baseInput,
      fetchImpl,
      timeoutMs: 10,
    });
    expect(result.ok).toBe(false);
  });
});
