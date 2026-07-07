import { isWeekendUtc } from '../utils/date.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class WeekendModifier implements GrowthModifierHandler {
  code = 'weekend';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return isWeekendUtc();
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const delta = Math.round(randomInRange(minDelta, maxDelta) * 100) / 100;
    return {
      delta,
      message: 'Вихідний день - природа сприяє росту! 🎉',
    };
  }
}
