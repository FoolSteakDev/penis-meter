import { fetchCityWeather, pickRandomCity, type CityWeather, type WeatherCategory } from '../services/weather.service';
import { rollBaseDelta } from '../utils/delta-roll.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growth-modifier.types';

const CATEGORY_LABELS: Record<WeatherCategory, string> = {
  clear: 'ясно',
  cloudy: 'хмарно',
  rain: 'дощ',
  snow: 'сніг',
  storm: 'гроза',
};

const HOT_THRESHOLD_C = 25;
const COLD_THRESHOLD_C = 0;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function adjustDeltaForWeather(baseDelta: number, weather: CityWeather, minDelta: number, maxDelta: number): number {
  let delta = baseDelta;

  if (weather.temperatureC > HOT_THRESHOLD_C && delta > 0) {
    delta *= 1.3;
  } else if (weather.temperatureC < COLD_THRESHOLD_C) {
    delta = delta < 0 ? delta * 1.3 : delta * 0.5;
  }

  if (weather.category === 'rain' || weather.category === 'snow') {
    delta -= randomInRange(0, Math.abs(minDelta) * 0.3);
  } else if (weather.category === 'storm') {
    delta -= randomInRange(0, Math.abs(minDelta) * 0.6);
  } else if (weather.category === 'clear') {
    delta += randomInRange(0, Math.abs(maxDelta) * 0.15);
  }

  return Math.round(delta * 100) / 100;
}

function buildFlavorText(weather: CityWeather, delta: number): string {
  const { city, temperatureC, category } = weather;
  const label = CATEGORY_LABELS[category];
  const tempStr = `${temperatureC > 0 ? '+' : ''}${Math.round(temperatureC)}°C`;

  const effectPhrase =
    delta > 0
      ? category === 'clear' && temperatureC > HOT_THRESHOLD_C
        ? 'спека розганяє ріст!'
        : 'погода сприяє росту!'
      : temperatureC < COLD_THRESHOLD_C
        ? 'мороз усе заморозив...'
        : category === 'storm'
          ? 'гроза все зіпсувала...'
          : 'негода трохи завадила...';

  return `У ${city.name} зараз ${tempStr}, ${label} - ${effectPhrase}`;
}

export class WeatherModifier implements GrowthModifierHandler {
  code = 'weather';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const city = pickRandomCity();

    try {
      const weather = await fetchCityWeather(city);
      const baseDelta = rollBaseDelta(context.condition);
      const delta = adjustDeltaForWeather(baseDelta, weather, minDelta, maxDelta);
      return {
        delta,
        message: buildFlavorText(weather, delta),
      };
    } catch (error) {
      console.error('[weather.modifier] failed to fetch weather', error);
      const delta = rollBaseDelta(context.condition);
      return {
        delta,
        message: 'Погода десь у світі вплинула на результат.',
      };
    }
  }
}
