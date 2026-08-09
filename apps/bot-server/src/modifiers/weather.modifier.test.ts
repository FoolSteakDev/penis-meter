import { describe, expect, it, vi } from 'vitest';
import { buildContext } from './test-helpers';
import { fetchCityWeather } from '../services/weather.service';
import { WeatherModifier } from './weather.modifier';

vi.mock('../services/weather.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/weather.service')>();
  return { ...actual, fetchCityWeather: vi.fn() };
});

describe('WeatherModifier', () => {
  it('is always eligible', async () => {
    const modifier = new WeatherModifier();
    expect(await modifier.isEligible(buildContext())).toBe(true);
  });

  it('delta stays within [minDelta, maxDelta] across weather categories', async () => {
    const modifier = new WeatherModifier();
    const categories = ['clear', 'cloudy', 'rain', 'snow', 'storm'] as const;
    for (const category of categories) {
      vi.mocked(fetchCityWeather).mockResolvedValue({
        city: { name: 'Kyiv', country: 'UA', lat: 50, lon: 30 },
        temperatureC: 30,
        category,
      });
      const { delta } = await modifier.apply(buildContext({ minDelta: -3, maxDelta: 3 }));
      expect(delta).toBeGreaterThanOrEqual(-3);
      expect(delta).toBeLessThanOrEqual(3);
    }
  });

  it('falls back to a plain roll and generic message when the API call fails', async () => {
    vi.mocked(fetchCityWeather).mockRejectedValue(new Error('Open-Meteo down'));
    const modifier = new WeatherModifier();
    const { delta, message } = await modifier.apply(buildContext({ minDelta: -3, maxDelta: 3 }));
    expect(delta).toBeGreaterThanOrEqual(-3);
    expect(delta).toBeLessThanOrEqual(3);
    expect(message).toBe('Погода десь у світі вплинула на результат.');
  });
});
