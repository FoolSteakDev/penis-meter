import { BaseModifier } from './base.modifier';
import { CriticalModifier } from './critical.modifier';
import type { GrowthModifierHandler } from './growthModifier.types';
import { WeatherModifier } from './weather.modifier';
import { WeekendModifier } from './weekend.modifier';

const handlers: GrowthModifierHandler[] = [
  new BaseModifier(),
  new WeatherModifier(),
  new WeekendModifier(),
  new CriticalModifier(),
];

export const modifierRegistry = new Map<string, GrowthModifierHandler>(
  handlers.map((handler) => [handler.code, handler]),
);
