import { describe, expect, it, vi } from 'vitest';
import { fetchWidgetConfig } from '../proactive/config-fetcher';

describe('fetchWidgetConfig', () => {
  it('returns the config payload on 200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        workspace_id: 'ws',
        config: { widget_proactive: { enabled: true } },
      }),
    });

    const result = await fetchWidgetConfig({
      baseUrl: 'https://api.example.com',
      apiKey: 'ak_pub_test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ widget_proactive: { enabled: true } });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/widgets/config',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer ak_pub_test' },
      }),
    );
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ config: {} }),
    });
    await fetchWidgetConfig({
      baseUrl: 'https://api.example.com/',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/widgets/config',
      expect.any(Object),
    );
  });

  it('returns undefined on non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    const result = await fetchWidgetConfig({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const result = await fetchWidgetConfig({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when config is missing from response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workspace_id: 'ws' }),
    });
    const result = await fetchWidgetConfig({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeUndefined();
  });
});
