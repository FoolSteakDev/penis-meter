import { BaseModifier } from './base.modifier';
import { ChatActivityModifier } from './chatActivity.modifier';
import { CriticalModifier } from './critical.modifier';
import { CryptoModifier } from './crypto.modifier';
import { CurrencyModifier } from './currency.modifier';
import { DuelModifier } from './duel.modifier';
import type { GrowthModifierHandler } from './growthModifier.types';
import { HistoricalDayModifier } from './historicalDay.modifier';
import { MoonPhaseModifier } from './moonPhase.modifier';
import { WeatherModifier } from './weather.modifier';
import { WeekendModifier } from './weekend.modifier';

const handlers: GrowthModifierHandler[] = [
  new BaseModifier(),
  new WeatherModifier(),
  new WeekendModifier(),
  new CriticalModifier(),
  new CurrencyModifier(),
  new MoonPhaseModifier(),
  new DuelModifier(),
  new CryptoModifier(),
  new HistoricalDayModifier(),
  new ChatActivityModifier(),
];

export const modifierRegistry = new Map<string, GrowthModifierHandler>(
  handlers.map((handler) => [handler.code, handler]),
);
