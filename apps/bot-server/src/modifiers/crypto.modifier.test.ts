import { describe, expect, it, vi } from 'vitest';
import { buildContext } from './test-helpers';
import { getBtcHourlyChange } from '../services/crypto.service';
import { CryptoModifier } from './crypto.modifier';

vi.mock('../services/crypto.service', () => ({
  getBtcHourlyChange: vi.fn(),
}));

describe('CryptoModifier', () => {
  it('is always eligible', async () => {
    const modifier = new CryptoModifier();
    expect(await modifier.isEligible(buildContext())).toBe(true);
  });

  it('delta stays within [minDelta, maxDelta] on the happy path', async () => {
    vi.mocked(getBtcHourlyChange).mockResolvedValue({ currentPrice: 65000, previousPrice: 60000, changePercent: 8.3 });
    const modifier = new CryptoModifier();
    const { delta, message } = await modifier.apply(buildContext({ minDelta: -3, maxDelta: 3 }));
    expect(delta).toBeGreaterThanOrEqual(-3);
    expect(delta).toBeLessThanOrEqual(3);
    expect(message).toContain('BTC');
  });

  it('falls back to a plain roll and generic message when the API call fails', async () => {
    vi.mocked(getBtcHourlyChange).mockRejectedValue(new Error('CoinGecko down'));
    const modifier = new CryptoModifier();
    const { delta, message } = await modifier.apply(buildContext({ minDelta: -3, maxDelta: 3 }));
    expect(delta).toBeGreaterThanOrEqual(-3);
    expect(delta).toBeLessThanOrEqual(3);
    expect(message).toBe('Крипторинок сьогодні непередбачуваний.');
  });
});
