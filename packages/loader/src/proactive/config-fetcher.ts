/**
 * Fetches the public widget config from `GET /api/widgets/config`.
 *
 * Used by the loader when initialising with a public key (`ak_pub_*`) which
 * doesn't go through the JWT exchange that returns `widget_config` in-line.
 *
 * Errors are swallowed and `undefined` returned — proactive engagement is
 * a feature, not a critical path. Chat still works without it.
 */

import type { WidgetConfigPayload } from '@automatos/core';

export interface FetchWidgetConfigOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export async function fetchWidgetConfig(
  opts: FetchWidgetConfigOptions,
): Promise<WidgetConfigPayload | undefined> {
  const { baseUrl, apiKey } = opts;
  const fetcher = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetcher) return undefined;
  try {
    const res = await fetcher(`${baseUrl.replace(/\/$/, '')}/api/widgets/config`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { config?: WidgetConfigPayload };
    return json.config ?? undefined;
  } catch {
    return undefined;
  }
}
