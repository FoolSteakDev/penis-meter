import { describe, expect, it, vi } from 'vitest';
import { buildContext } from './test-helpers';
import { getUsdRateChange } from '../services/currency.service';
import { CurrencyModifier } from './currency.modifier';

vi.mock('../services/currency.service', () => ({
  getUsdRateChange: vi.fn(),
}));

describe('CurrencyModifier', () => {
  it('is always eligible', async () => {
    const modifier = new CurrencyModifier();
    expect(await modifier.isEligible(buildContext())).toBe(true);
  });

  it('delta stays within [minDelta, maxDelta] on the happy path', async () => {
    vi.mocked(getUsdRateChange).mockResolvedValue({ currentRate: 42, previousRate: 40, changePercent: 5 });
    const modifier = new CurrencyModifier();
    const { delta, message } = await modifier.apply(buildContext({ minDelta: -3, maxDelta: 3 }));
    expect(delta).toBeGreaterThanOrEqual(-3);
    expect(delta).toBeLessThanOrEqual(3);
    expect(message).toContain('Долар');
  });

  it('falls back to a plain roll and generic message when the API call fails', async () => {
    vi.mocked(getUsdRateChange).mockRejectedValue(new Error('NBU down'));
    const modifier = new CurrencyModifier();
    const { delta, message } = await modifier.apply(buildContext({ minDelta: -3, maxDelta: 3 }));
    expect(delta).toBeGreaterThanOrEqual(-3);
    expect(delta).toBeLessThanOrEqual(3);
    expect(message).toBe('Курс валют сьогодні вирішив втрутитись у результат.');
  });
});
