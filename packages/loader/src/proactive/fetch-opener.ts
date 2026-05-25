/**
 * Fetches a context-aware opener from the agent (PRD-007).
 *
 * Calls POST /api/widgets/chat with `trigger_reason: 'proactive_opener'`
 * and the current page context. The orchestrator routes this to the
 * shopify-support skill's "Proactive Opener Mode" branch, which returns
 * a single-sentence contextual greeting.
 *
 * Consumes the SSE stream and accumulates the text content of `message`
 * events until `done`. Falls back to `null` on any error so the canned
 * fallback stays visible — proactive engagement degrades gracefully.
 */

import type { PageContext } from '@automatos/core';

export interface FetchOpenerOptions {
  baseUrl: string;
  apiKey: string;
  agentId?: string;
  pageContext: PageContext;
  /**
   * Which proactive trigger to send to the orchestrator. Picks the matching
   * directive builder server-side. Default 'proactive_opener' (product-page).
   * PRD-008-B Feature C2 uses 'cart_idle' for the cart-page nudge.
   */
  triggerReason?: 'proactive_opener' | 'cart_idle';
  /**
   * Hard timeout for the whole request, including tool calls + LLM generation.
   * Default 30s — real-world agent responses with a knowledge-graph lookup +
   * LLM completion often take 5-15s.
   */
  timeoutMs?: number;
  /** Test injection */
  fetchImpl?: typeof fetch;
}

export async function fetchProactiveOpener(
  opts: FetchOpenerOptions,
): Promise<string | null> {
  const fetcher = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetcher) return null;

  const url = `${opts.baseUrl.replace(/\/$/, '')}/api/widgets/chat`;
  const body = {
    message: '',
    agent_id: opts.agentId,
    trigger_reason: opts.triggerReason ?? 'proactive_opener',
    page_context: opts.pageContext,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);

  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) return null;

    const text = await accumulateSseMessageText(res.body);
    return text.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Reads an SSE stream and concatenates the `content` field of every
 * `message` event. Stops on `done` or stream end.
 */
async function accumulateSseMessageText(
  body: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let collected = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by blank lines
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const parsed = parseSseEvent(rawEvent);
      if (!parsed) continue;

      if (parsed.event === 'message' && typeof parsed.data?.content === 'string') {
        collected += parsed.data.content;
      } else if (parsed.event === 'done') {
        return collected;
      } else if (parsed.event === 'error') {
        return collected; // bail with whatever we have so far
      }
      // ignore tool-start / tool-end — openers shouldn't use tools anyway
    }
  }

  return collected;
}

function parseSseEvent(
  raw: string,
): { event: string; data: Record<string, unknown> | null } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return { event, data: null };
  const dataStr = dataLines.join('\n');
  try {
    return { event, data: JSON.parse(dataStr) };
  } catch {
    return { event, data: null };
  }
}
