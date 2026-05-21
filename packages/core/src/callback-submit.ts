/**
 * POST /api/widgets/callback helper (PRD-008-A Feature B).
 *
 * Pure-function submit. The CallbackForm component handles UI state;
 * this module owns the network call + the response shape.
 *
 * Backend contract:
 *   POST /api/widgets/callback
 *     Headers: Authorization: Bearer <ak_pub_*>
 *     Body:    { session_id, phone, name, product_context?, urgency?, preferred_time? }
 *     202 →    { accepted: true, request_id, eta_phrase }
 *     400 →    invalid phone (E.164 hint in detail)
 *     403 →    feature not enabled for the Site
 *     429 →    rate limited (Retry-After header)
 *     503 →    Site not provisioned (migration not run)
 */

export interface CallbackSubmitInput {
  baseUrl: string;
  apiKey: string;
  session_id: string;
  phone: string;
  name: string;
  product_context?: string;
  urgency?: string;
  preferred_time?: string;
  /** Override fetch for tests */
  fetchImpl?: typeof fetch;
  /** Abort the request after this many ms (default 10000). */
  timeoutMs?: number;
}

export type CallbackSubmitResult =
  | {
      ok: true;
      request_id: string;
      eta_phrase: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
      retryAfterSeconds?: number;
    };


export async function submitCallback(
  input: CallbackSubmitInput,
): Promise<CallbackSubmitResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = input.baseUrl.replace(/\/$/, '');

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? 10_000,
  );

  let resp: Response;
  try {
    resp = await fetchImpl(`${baseUrl}/api/widgets/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        session_id: input.session_id,
        phone: input.phone,
        name: input.name,
        product_context: input.product_context,
        urgency: input.urgency,
        preferred_time: input.preferred_time,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : 'network error',
    };
  } finally {
    clearTimeout(timeoutId);
  }

  // 202 ACCEPTED — happy path
  if (resp.status === 202) {
    try {
      const body = (await resp.json()) as {
        request_id: string;
        eta_phrase: string;
      };
      return {
        ok: true,
        request_id: body.request_id,
        eta_phrase: body.eta_phrase,
      };
    } catch {
      return {
        ok: false,
        status: resp.status,
        message: 'malformed accept response',
      };
    }
  }

  // Failure — try to surface the server's detail string
  let message = `request failed (${resp.status})`;
  try {
    const body = (await resp.json()) as { detail?: string };
    if (body.detail) message = body.detail;
  } catch {
    // body wasn't JSON; keep the generic message
  }

  let retryAfterSeconds: number | undefined;
  const retryAfter = resp.headers.get('Retry-After');
  if (retryAfter) {
    const parsed = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(parsed)) retryAfterSeconds = parsed;
  }

  return {
    ok: false,
    status: resp.status,
    message,
    retryAfterSeconds,
  };
}
