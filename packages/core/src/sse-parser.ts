import type { SSEEvent, SSEEventType } from './types';
import { StreamError } from './errors';

/**
 * Parses an SSE stream from a ReadableStream<Uint8Array>.
 * Handles buffer splitting, malformed chunks, and connection drops.
 * Yields typed SSEEvent objects.
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent: SSEEventType = 'message';

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete events (double newline delimited)
      const parts = buffer.split('\n\n');
      // Last part may be incomplete — keep in buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let data: Record<string, unknown> | null = null;

        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim() as SSEEventType;
          } else if (line.startsWith('data:')) {
            const raw = line.slice(5).trim();
            if (!raw) continue;
            try {
              data = JSON.parse(raw);
            } catch {
              // Non-JSON data — wrap as content string
              data = { content: raw };
            }
          }
          // Ignore other SSE fields (id:, retry:, comments)
        }

        if (data) {
          yield { event: currentEvent, data };
          currentEvent = 'message'; // reset to default
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        if (line.startsWith('data:')) {
          const raw = line.slice(5).trim();
          if (raw) {
            try {
              const data = JSON.parse(raw);
              yield { event: currentEvent, data };
            } catch {
              yield { event: currentEvent, data: { content: raw } };
            }
          }
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    throw new StreamError(
      err instanceof Error ? err.message : 'Stream reading failed',
    );
  } finally {
    reader.releaseLock();
  }
}
