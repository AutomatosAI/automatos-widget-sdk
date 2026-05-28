import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutomatosClient } from '../client';
import type { AutomatosConfig, PageContext } from '../types';

/**
 * PRD-141: regular chat messages must forward the page snapshot (page_context)
 * the same way proactive openers already do, so the agent can resolve "this
 * product" / "it" and ground answers in real page facts. These tests pin the
 * request body the client POSTs to /api/widgets/chat.
 */

function doneStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = false;
  return new ReadableStream({
    pull(controller) {
      if (!sent) {
        controller.enqueue(
          encoder.encode('event: done\ndata: {"conversation_id":"conv_test"}\n\n'),
        );
        sent = true;
      } else {
        controller.close();
      }
    },
  });
}

interface CapturedRequest {
  url: string;
  body: Record<string, unknown>;
}

function installFetchCapture(): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      captured.push({
        url: String(url),
        body: init?.body ? JSON.parse(init.body as string) : {},
      });
      return {
        ok: true,
        status: 200,
        body: doneStream(),
      } as unknown as Response;
    }),
  );
  return captured;
}

function makeClient(overrides: Partial<AutomatosConfig> = {}): AutomatosClient {
  const config: AutomatosConfig = {
    apiKey: 'ak_pub_test',
    widget: 'chat',
    baseUrl: 'https://api.example.test',
    agentId: 'agent_123',
    ...overrides,
  };
  return new AutomatosClient(config);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AutomatosClient.sendMessage — page_context forwarding (PRD-141)', () => {
  it('forwards config.pageContext on a regular message', async () => {
    const captured = installFetchCapture();
    const pageContext: PageContext = {
      pageType: 'product',
      productTitle: 'Hochiki CHQ-DSC2 Fire Alarm',
      productVendor: 'Hochiki',
      productPrice: '129.99',
      productAvailable: true,
    };
    const client = makeClient({ pageContext });

    await client.sendMessage('tell me about this product');

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('https://api.example.test/api/widgets/chat');
    expect(captured[0].body.message).toBe('tell me about this product');
    expect(captured[0].body.page_context).toEqual(pageContext);
  });

  it('omits page_context entirely when none is configured', async () => {
    const captured = installFetchCapture();
    const client = makeClient(); // no pageContext, no pageContextElement

    await client.sendMessage('hello');

    expect(captured).toHaveLength(1);
    expect('page_context' in captured[0].body).toBe(false);
  });

  it('sends a fresh snapshot if the source mutates between sends', async () => {
    // The host may hand the client the same config object and mutate the
    // snapshot as the visitor navigates (SPA). Each send must reflect the
    // current value, not the value at construction time.
    const config: AutomatosConfig = {
      apiKey: 'ak_pub_test',
      widget: 'chat',
      baseUrl: 'https://api.example.test',
      pageContext: { pageType: 'product', productTitle: 'First Product' },
    };
    const client = new AutomatosClient(config);

    const captured = installFetchCapture();
    await client.sendMessage('first');
    config.pageContext = { pageType: 'product', productTitle: 'Second Product' };
    await client.sendMessage('second');

    expect((captured[0].body.page_context as PageContext).productTitle).toBe('First Product');
    expect((captured[1].body.page_context as PageContext).productTitle).toBe('Second Product');
  });
});
