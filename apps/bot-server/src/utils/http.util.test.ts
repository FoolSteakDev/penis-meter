import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJson } from './http.util';

describe('fetchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on a successful response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ hello: 'world' }) });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchJson<{ hello: string }>('https://example.com/api');
    expect(result).toEqual({ hello: 'world' });
  });

  it('throws when the response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchJson('https://example.com/api')).rejects.toThrow('503');
  });
});
