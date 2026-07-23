import { BaseModifier } from './base.modifier';
import { ChatActivityModifier } from './chat-activity.modifier';
import { CriticalModifier } from './critical.modifier';
import { CryptoModifier } from './crypto.modifier';
import { CurrencyModifier } from './currency.modifier';
import type { GrowthModifierHandler } from './growth-modifier.types';
import { HistoricalDayModifier } from './historical-day.modifier';
import { MoonPhaseModifier } from './moon-phase.modifier';
import { WeatherModifier } from './weather.modifier';
import { WeekendModifier } from './weekend.modifier';

const handlers: GrowthModifierHandler[] = [
  new BaseModifier(),
  new WeatherModifier(),
  new WeekendModifier(),
  new CriticalModifier(),
  new CurrencyModifier(),
  new MoonPhaseModifier(),
  new CryptoModifier(),
  new HistoricalDayModifier(),
  new ChatActivityModifier(),
];

export const modifierRegistry = new Map<string, GrowthModifierHandler>(
  handlers.map((handler) => [handler.code, handler]),
);
