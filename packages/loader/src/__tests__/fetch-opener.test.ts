import { describe, expect, it, vi } from 'vitest';
import { fetchProactiveOpener } from '../proactive/fetch-opener';

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
}

describe('fetchProactiveOpener', () => {
  it('aggregates message content and returns trimmed text', async () => {
    const stream = sseStream([
      'event: message\ndata: {"content":"Looking at "}\n\n',
      'event: message\ndata: {"content":"the EN 12101-9"}\n\n',
      'event: message\ndata: {"content":" panel — want help?"}\n\n',
      'event: done\ndata: {"conversation_id":"abc"}\n\n',
    ]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, body: stream });

    const result = await fetchProactiveOpener({
      baseUrl: 'https://api.example.com',
      apiKey: 'ak_pub_test',
      pageContext: { pageType: 'product', productHandle: 'fan' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toBe('Looking at the EN 12101-9 panel — want help?');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer ak_pub_test');
    expect(JSON.parse(init.body)).toMatchObject({
      message: '',
      trigger_reason: 'proactive_opener',
      page_context: { pageType: 'product', productHandle: 'fan' },
    });
  });

  it('returns null on non-2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, body: null });
    const result = await fetchProactiveOpener({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      pageContext: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const result = await fetchProactiveOpener({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      pageContext: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it('handles error SSE event by returning whatever was accumulated', async () => {
    const stream = sseStream([
      'event: message\ndata: {"content":"Looking at"}\n\n',
      'event: error\ndata: {"message":"upstream timeout"}\n\n',
    ]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, body: stream });
    const result = await fetchProactiveOpener({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      pageContext: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('Looking at');
  });

  it('ignores tool-start / tool-end events', async () => {
    const stream = sseStream([
      'event: tool-start\ndata: {"tool":"some_tool"}\n\n',
      'event: message\ndata: {"content":"hello"}\n\n',
      'event: tool-end\ndata: {"tool":"some_tool","result":42}\n\n',
      'event: message\ndata: {"content":" world"}\n\n',
      'event: done\ndata: {}\n\n',
    ]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, body: stream });
    const result = await fetchProactiveOpener({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      pageContext: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('hello world');
  });

  it('returns null on empty/whitespace-only collected text', async () => {
    const stream = sseStream([
      'event: message\ndata: {"content":"   "}\n\n',
      'event: done\ndata: {}\n\n',
    ]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, body: stream });
    const result = await fetchProactiveOpener({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      pageContext: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it('handles split chunks (event across buffer boundary)', async () => {
    const stream = sseStream([
      'event: message\ndata: {"content":"hel',
      'lo"}\n\nevent: message\ndata: {"content":" world"}\n\n',
      'event: done\ndata: {}\n\n',
    ]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, body: stream });
    const result = await fetchProactiveOpener({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      pageContext: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('hello world');
  });
});
