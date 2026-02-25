import { describe, it, expect } from 'vitest';
import { parseSSEStream } from '../sse-parser';

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

describe('parseSSEStream', () => {
  it('parses a single complete event', async () => {
    const stream = makeStream(['data: {"content":"hello"}\n\n']);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: 'message',
      data: { content: 'hello' },
    });
  });

  it('parses multiple events', async () => {
    const stream = makeStream([
      'data: {"content":"hi"}\n\n',
      'data: {"content":" there"}\n\n',
    ]);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events).toHaveLength(2);
    expect(events[0].data).toEqual({ content: 'hi' });
    expect(events[1].data).toEqual({ content: ' there' });
  });

  it('handles split chunks across reads', async () => {
    // Event split across two chunks
    const stream = makeStream([
      'data: {"con',
      'tent":"split"}\n\n',
    ]);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ content: 'split' });
  });

  it('parses named events', async () => {
    const stream = makeStream([
      'event: done\ndata: {"conversation_id":"abc"}\n\n',
    ]);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('done');
    expect(events[0].data).toEqual({ conversation_id: 'abc' });
  });

  it('handles non-JSON data', async () => {
    const stream = makeStream(['data: just text\n\n']);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ content: 'just text' });
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    const stream = makeStream([
      'data: {"content":"one"}\n\n',
      'data: {"content":"two"}\n\n',
    ]);
    const events = [];
    controller.abort();
    for await (const event of parseSSEStream(stream, controller.signal)) {
      events.push(event);
    }
    expect(events).toHaveLength(0);
  });

  it('handles remaining buffer at end of stream', async () => {
    // No trailing \n\n
    const stream = makeStream(['data: {"content":"tail"}']);
    const events = [];
    for await (const event of parseSSEStream(stream)) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ content: 'tail' });
  });
});
