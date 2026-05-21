/**
 * PRD-008-A.2 — SDK side of the chat-intent → callback-form auto-trigger.
 *
 * Verifies that:
 *  1. The SSE event-type ``open-callback-form`` is parsed by sse-parser.
 *  2. When the bus emits ``chat:open-callback-form``, the loader auto-opens
 *     the phone-capture form with the supplied product_context.
 *  3. Unsubscribe runs on destroy so the listener doesn't leak.
 */
import { describe, it, expect, vi } from 'vitest';
import { parseSSEStream, EventBus } from '@automatos/core';
import type { WidgetEvents } from '@automatos/core';

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

describe('PRD-008-A.2 — open-callback-form SSE event', () => {
  it('SSE parser yields open-callback-form events with the right data', async () => {
    const stream = makeStream([
      'event: open-callback-form\ndata: {"conversation_id":"chat_abc","product_context":"EN 12101 panel"}\n\n',
    ]);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: 'open-callback-form',
      data: {
        conversation_id: 'chat_abc',
        product_context: 'EN 12101 panel',
      },
    });
  });

  it('SSE parser handles open-callback-form without product_context', async () => {
    const stream = makeStream([
      'event: open-callback-form\ndata: {"conversation_id":"chat_xyz","product_context":null}\n\n',
    ]);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events[0].data.product_context).toBeNull();
  });

  it('bus subscribers receive the typed payload and call openCallbackForm', () => {
    const bus = new EventBus<WidgetEvents>();
    const opener = vi.fn();

    const unsub = bus.on('chat:open-callback-form', ({ productContext }) => {
      opener({ product_context: productContext ?? undefined });
    });

    bus.emit('chat:open-callback-form', {
      conversationId: 'chat_abc',
      productContext: 'EN 12101 panel',
    });

    expect(opener).toHaveBeenCalledOnce();
    expect(opener).toHaveBeenCalledWith({ product_context: 'EN 12101 panel' });

    // No second call after unsubscribe
    unsub();
    bus.emit('chat:open-callback-form', {
      conversationId: 'chat_def',
      productContext: 'Other product',
    });
    expect(opener).toHaveBeenCalledOnce();
  });

  it('null productContext is normalised to undefined for openCallbackForm', () => {
    const bus = new EventBus<WidgetEvents>();
    const opener = vi.fn();

    bus.on('chat:open-callback-form', ({ productContext }) => {
      opener({ product_context: productContext ?? undefined });
    });

    bus.emit('chat:open-callback-form', {
      conversationId: 'chat_abc',
      productContext: null,
    });

    expect(opener).toHaveBeenCalledWith({ product_context: undefined });
  });
});
