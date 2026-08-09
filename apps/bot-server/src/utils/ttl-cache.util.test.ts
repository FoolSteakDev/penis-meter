import { describe, expect, it, vi } from 'vitest';
import { createTtlCache } from './ttl-cache.util';

describe('createTtlCache', () => {
  it('single-flights concurrent resolves for the same key', async () => {
    const cache = createTtlCache<number>(60_000);
    const load = vi.fn().mockResolvedValue(42);

    const [a, b, c] = await Promise.all([
      cache.resolve('k', load),
      cache.resolve('k', load),
      cache.resolve('k', load),
    ]);

    expect([a, b, c]).toEqual([42, 42, 42]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached value within the TTL window', async () => {
    const cache = createTtlCache<number>(60_000);
    const load = vi.fn().mockResolvedValue(1);

    await cache.resolve('k', load);
    await cache.resolve('k', load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejected load - the next call retries', async () => {
    const cache = createTtlCache<number>(60_000);
    const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(7);

    await expect(cache.resolve('k', load)).rejects.toThrow('boom');
    await expect(cache.resolve('k', load)).resolves.toBe(7);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('invalidate(key) forces the next resolve to reload', async () => {
    const cache = createTtlCache<number>(60_000);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.resolve('k', load)).toBe(1);
    cache.invalidate('k');
    expect(await cache.resolve('k', load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('invalidate() with no key clears every entry', async () => {
    const cache = createTtlCache<number>(60_000);
    const loadA = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(11);
    const loadB = vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(22);

    await cache.resolve('a', loadA);
    await cache.resolve('b', loadB);
    cache.invalidate();

    expect(await cache.resolve('a', loadA)).toBe(11);
    expect(await cache.resolve('b', loadB)).toBe(22);
  });
});
