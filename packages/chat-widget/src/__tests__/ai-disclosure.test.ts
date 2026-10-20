/**
 * PRD-264 EUAI-02b (EU AI Act Art. 50(1) and 50(5)): the chat widget says it
 * is an AI in its header and in its opening turn, before the visitor types,
 * and no deployer option (title, greeting, theme colours) removes that.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutomatosConfig } from '@automatos/core';
import { ChatWidget } from '../chat-widget';
import { aiNoticeCSS } from '../styles/ai-notice';

const DEFAULT_LINE = 'You are chatting with an AI assistant.';
const PT_NOTICE = {
  badge: 'IA',
  line: 'Está a conversar com um assistente de IA da Loja Lisboa.',
  locale: 'pt',
};
const DE_NOTICE = {
  badge: 'KI',
  line: 'Sie chatten mit einem KI-Assistenten.',
  locale: 'de',
};
const CONFIG_PATH = '/api/widgets/config';
const CHAT_PATH = '/api/widgets/chat';

interface FetchRoutes {
  /** The `config` block GET /api/widgets/config returns; undefined = old server (no block). */
  config?: Record<string, unknown>;
  configStatus?: number;
  /** SSE frames POST /api/widgets/chat streams; undefined = never answers. */
  chatFrames?: string[];
  /** Never answer the config request. */
  configPending?: boolean;
}

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

/** Let pending fetch promises and their handlers run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function never<T>(): Promise<T> {
  return new Promise<T>(() => undefined);
}

function configResponse(routes: FetchRoutes): Response {
  const status = routes.configStatus ?? 200;
  const body = routes.config === undefined
    ? { workspace_id: 'ws_test' }
    : { workspace_id: 'ws_test', config: routes.config };
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => '',
  } as unknown as Response;
}

function stubFetch(routes: FetchRoutes): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(String(url)).pathname;
      if (path === CONFIG_PATH) {
        return routes.configPending ? never<Response>() : configResponse(routes);
      }
      if (path === CHAT_PATH && routes.chatFrames) {
        return { ok: true, status: 200, body: sseStream(routes.chatFrames) } as unknown as Response;
      }
      return never<Response>();
    }),
  );
}

let widget: ChatWidget | null = null;

function mountWidget(overrides: Partial<AutomatosConfig> = {}): ShadowRoot {
  widget = new ChatWidget({
    apiKey: 'ak_pub_test',
    widget: 'chat',
    baseUrl: 'https://api.example.test',
    ...overrides,
  });
  const host = document.getElementById('automatos-widget');
  if (!host?.shadowRoot) throw new Error('widget host did not mount');
  return host.shadowRoot;
}

function headerBadge(shadow: ShadowRoot): HTMLElement | null {
  return shadow.querySelector<HTMLElement>('.aw-header [data-ai-badge]');
}

function noticeLine(shadow: ShadowRoot): string | null | undefined {
  return shadow.querySelector('[data-ai-notice] .aw-ai-notice-line')?.textContent;
}

function messages(shadow: ShadowRoot): HTMLElement {
  return shadow.querySelector<HTMLElement>('.aw-messages')!;
}

function typeAndSend(shadow: ShadowRoot, text: string): void {
  const textarea = shadow.querySelector<HTMLTextAreaElement>('.aw-textarea')!;
  textarea.value = text;
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  widget?.destroy();
  widget = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ChatWidget AI notice (PRD-264 EUAI-02b)', () => {
  it('is labelled from the first paint, before any config arrives', () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget();

    expect(headerBadge(shadow)?.textContent).toBe('AI');
    expect(noticeLine(shadow)).toBe(DEFAULT_LINE);
  });

  it('renders the notice as the opening turn, before any message', () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget();

    const first = messages(shadow).firstElementChild as HTMLElement;
    expect(first.hasAttribute('data-ai-notice')).toBe(true);
    expect(first.getAttribute('role')).toBe('note');
  });

  it("shows the server's notice from the widget config", async () => {
    stubFetch({ config: { ai_disclosure: PT_NOTICE } });
    const shadow = mountWidget();

    await vi.waitFor(() => expect(headerBadge(shadow)?.textContent).toBe('IA'));
    expect(noticeLine(shadow)).toBe(PT_NOTICE.line);
    expect(headerBadge(shadow)?.getAttribute('title')).toBe('Assistente de IA');
  });

  it('keeps the English default when an old server sends no ai_disclosure', async () => {
    stubFetch({ config: { callback: { enabled: false, intent_phrases: [] } } });
    const shadow = mountWidget();

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await settle();
    expect(console.warn).not.toHaveBeenCalled();
    expect(headerBadge(shadow)?.textContent).toBe('AI');
    expect(noticeLine(shadow)).toBe(DEFAULT_LINE);
    expect(shadow.querySelectorAll('[data-ai-notice]')).toHaveLength(1);
  });

  it('keeps the English default when the config request fails', async () => {
    stubFetch({ configStatus: 503 });
    const shadow = mountWidget();

    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(headerBadge(shadow)?.textContent).toBe('AI');
    expect(noticeLine(shadow)).toBe(DEFAULT_LINE);
  });

  it('survives a title override: the title changes, the badge stays', async () => {
    stubFetch({ config: { ai_disclosure: PT_NOTICE } });
    const shadow = mountWidget({ title: 'Loja Lisboa' });

    expect(shadow.querySelector('.aw-header-title')?.textContent).toBe('Loja Lisboa');
    expect(headerBadge(shadow)?.textContent).toBe('AI');
    await vi.waitFor(() => expect(headerBadge(shadow)?.textContent).toBe('IA'));
    expect(shadow.querySelector('.aw-header-title')?.textContent).toBe('Loja Lisboa');
    expect(noticeLine(shadow)).toBe(PT_NOTICE.line);
  });

  it('survives a greeting override: the greeting renders after the notice', () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget({ greeting: 'Hi! Ask us anything.' });

    const [first, second] = Array.from(messages(shadow).children) as HTMLElement[];
    expect(first.hasAttribute('data-ai-notice')).toBe(true);
    expect(noticeLine(shadow)).toBe(DEFAULT_LINE);
    expect(second.classList.contains('aw-bubble-assistant')).toBe(true);
    expect(second.textContent).toContain('Hi! Ask us anything.');
    expect(headerBadge(shadow)?.textContent).toBe('AI');
  });

  it('renders no greeting bubble when none is set', () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget({ greeting: '   ' });

    expect(messages(shadow).children).toHaveLength(1);
  });

  it('survives a theme colour override: the notice reads no theme variable', () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget({
      themeOverrides: {
        '--aw-primary': '#ffffff',
        '--aw-bg': '#ffffff',
        '--aw-bg-secondary': '#ffffff',
        '--aw-text': '#ffffff',
        '--aw-text-secondary': '#ffffff',
        '--aw-border': '#ffffff',
      },
    });

    expect(headerBadge(shadow)?.textContent).toBe('AI');
    expect(noticeLine(shadow)).toBe(DEFAULT_LINE);
    // The badge and notice colours are literals, so the white-on-white
    // overrides above can't reach them.
    const style = shadow.querySelector('style')?.textContent ?? '';
    expect(style).toContain(aiNoticeCSS);
    expect(aiNoticeCSS).not.toMatch(/var\(/);
    expect(aiNoticeCSS).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  });

  it("updates to the stream's notice (the first chat event) and keeps it out of the answer", async () => {
    stubFetch({
      configPending: true,
      chatFrames: [
        `event: ai_disclosure\ndata: ${JSON.stringify({ type: 'ai_disclosure', ...DE_NOTICE })}\n\n`,
        'event: message\ndata: {"content":"Hallo!","ai_generated":true}\n\n',
        'event: done\ndata: {"conversation_id":"conv_1"}\n\n',
      ],
    });
    const shadow = mountWidget({ title: 'Laden' });

    typeAndSend(shadow, 'hi');

    await vi.waitFor(() => expect(headerBadge(shadow)?.textContent).toBe('KI'));
    expect(noticeLine(shadow)).toBe(DE_NOTICE.line);
    await vi.waitFor(() =>
      expect(shadow.querySelector('.aw-bubble-assistant')?.textContent).toContain('Hallo!'),
    );
    expect(messages(shadow).firstElementChild?.hasAttribute('data-ai-notice')).toBe(true);
    expect(shadow.querySelectorAll('[data-ai-notice]')).toHaveLength(1);
  });
});

describe('ChatWidget accessible names (PRD-264 EUAI-02b)', () => {
  it('the launcher names the AI', () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget();
    const fab = shadow.querySelector('.aw-fab')!;

    expect(fab.getAttribute('aria-label')).toBe('Open AI assistant chat');
    widget!.open();
    expect(fab.getAttribute('aria-label')).toBe('Close AI assistant chat');
    widget!.close();
    expect(fab.getAttribute('aria-label')).toBe('Open AI assistant chat');
  });

  it('the typing indicator names the AI', async () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget();

    typeAndSend(shadow, 'hello');

    await vi.waitFor(() => expect(shadow.querySelector('.aw-typing')).not.toBeNull());
    expect(shadow.querySelector('.aw-typing')?.getAttribute('aria-label')).toBe(
      'AI assistant is typing',
    );
  });

  it('the panel names the AI', () => {
    stubFetch({ configPending: true });
    const shadow = mountWidget();

    expect(shadow.querySelector('.aw-panel')?.getAttribute('aria-label')).toBe(
      'AI assistant chat',
    );
  });
});
