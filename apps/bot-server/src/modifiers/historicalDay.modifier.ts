import { getTodayHistoricalEvent } from '../services/historicalDay.service';
import { rollBaseDelta } from '../utils/deltaRoll.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

export class HistoricalDayModifier implements GrowthModifierHandler {
  code = 'historical_day';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return getTodayHistoricalEvent() !== null;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const historicalEvent = getTodayHistoricalEvent();

    // isEligible вже гарантує наявність події на сьогодні, але про всяк випадок
    const delta = rollBaseDelta(context.condition);

    if (!historicalEvent) {
      return { delta, message: '' };
    }

    return {
      delta,
      message: `📅 Сьогодні в історії: ${historicalEvent.event} - ${historicalEvent.text}`,
    };
  }
}
