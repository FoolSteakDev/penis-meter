import { getTodayHistoricalEvent } from '../services/historicalDay.service';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class HistoricalDayModifier implements GrowthModifierHandler {
  code = 'historical_day';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return getTodayHistoricalEvent() !== null;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const historicalEvent = getTodayHistoricalEvent();

    // isEligible вже гарантує наявність події на сьогодні, але про всяк випадок
    const delta = Math.round(randomInRange(minDelta, maxDelta) * 100) / 100;

    if (!historicalEvent) {
      return { delta, message: '' };
    }

    return {
      delta,
      message: `📅 Сьогодні в історії: ${historicalEvent.event} - ${historicalEvent.text}`,
    };
  }
}
