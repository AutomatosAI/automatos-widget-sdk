import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutomatosClient } from '../client';
import { NetworkError } from '../errors';
import type { AIDisclosure, AutomatosConfig } from '../types';

/**
 * PRD-264 EUAI-02b: the client hands the server's AI notice to the widget,
 * from the public config and from the first event of every chat stream
 * (the EUAI-02a contract), and never treats the notice as answer text.
 */

const PT_NOTICE = {
  badge: 'IA',
  line: 'Está a conversar com um assistente de IA da Loja.',
  locale: 'pt',
};

function sseStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < frames.length) {
        controller.enqueue(encoder.encode(frames[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

/** A fetch stub answering every call with `response` (a Response-shaped object). */
function stubFetch(response: Record<string, unknown>) {
  const fetchMock = vi.fn(
    async () => ({ ok: true, status: 200, ...response }) as unknown as Response,
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function makeClient(overrides: Partial<AutomatosConfig> = {}): AutomatosClient {
  return new AutomatosClient({
    apiKey: 'ak_pub_test',
    widget: 'chat',
    baseUrl: 'https://api.example.test',
    ...overrides,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AutomatosClient chat stream: ai_disclosure (PRD-264 EUAI-02a contract)', () => {
  it('emits the notice from the first event and keeps it out of the answer text', async () => {
    stubFetch({
      body: sseStream([
        `event: ai_disclosure\ndata: ${JSON.stringify({ type: 'ai_disclosure', ...PT_NOTICE })}\n\n`,
        'event: message\ndata: {"content":"Olá!","ai_generated":true}\n\n',
        'event: done\ndata: {"conversation_id":"conv_1"}\n\n',
      ]),
    });
    const client = makeClient();
    const notices: AIDisclosure[] = [];
    const chunks: string[] = [];
    client.events.on('chat:ai-disclosure', (d) => notices.push(d));
    client.events.on('chat:chunk', ({ content }) => chunks.push(content));

    const { assistantMessage } = await client.sendMessage('hi');

    expect(notices).toEqual([PT_NOTICE]);
    expect(chunks).toEqual(['Olá!']);
    const stored = client.conversation.getMessages().find((m) => m.id === assistantMessage.id);
    expect(stored?.content).toBe('Olá!');
  });

  it('recognises the notice by data.type when the stream has no event: line', async () => {
    stubFetch({
      body: sseStream([
        `data: ${JSON.stringify({ type: 'ai_disclosure', ...PT_NOTICE })}\n\n`,
        'data: {"content":"Olá!"}\n\n',
      ]),
    });
    const client = makeClient();
    const notices: AIDisclosure[] = [];
    const chunks: string[] = [];
    client.events.on('chat:ai-disclosure', (d) => notices.push(d));
    client.events.on('chat:chunk', ({ content }) => chunks.push(content));

    await client.sendMessage('hi');

    expect(notices).toEqual([PT_NOTICE]);
    expect(chunks).toEqual(['Olá!']);
  });

  it('turns a malformed notice event into the English default, never nothing', async () => {
    stubFetch({
      body: sseStream(['event: ai_disclosure\ndata: {"type":"ai_disclosure"}\n\n']),
    });
    const client = makeClient();
    const notices: AIDisclosure[] = [];
    client.events.on('chat:ai-disclosure', (d) => notices.push(d));

    await client.sendMessage('hi');

    expect(notices).toEqual([
      { badge: 'AI', line: 'You are chatting with an AI assistant.', locale: 'en' },
    ]);
  });
});

describe('AutomatosClient.getWidgetConfig', () => {
  it('GETs the public config with the key and returns its config block', async () => {
    const fetchMock = stubFetch({
      json: async () => ({ workspace_id: 'ws_1', config: { ai_disclosure: PT_NOTICE } }),
    });
    const config = await makeClient().getWidgetConfig();

    expect(config.ai_disclosure).toEqual(PT_NOTICE);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.test/api/widgets/config');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ak_pub_test');
  });

  it('returns an empty config when the server sends none (old server)', async () => {
    stubFetch({ json: async () => ({ workspace_id: 'ws_1' }) });
    expect(await makeClient().getWidgetConfig()).toEqual({});
  });

  it('throws a NetworkError on a non-2xx answer', async () => {
    stubFetch({ ok: false, status: 503, json: async () => ({}) });
    await expect(makeClient().getWidgetConfig()).rejects.toBeInstanceOf(NetworkError);
  });
});
