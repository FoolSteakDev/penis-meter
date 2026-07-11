import { rollBaseDelta } from '../utils/deltaRoll.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

/**
 * Фолбек для умов без власного handler'а (кастомні умови типу "джекпот",
 * створені через адмінку) - просто рівномірний рандом у [minDelta, maxDelta].
 * Не реєструється в modifier.registry - measurement.service підставляє його
 * сам, коли для `condition.code` немає відповідного handler'а.
 */
export class GenericModifier implements GrowthModifierHandler {
  code = '__generic__';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const delta = rollBaseDelta(context.condition);
    return {
      delta,
      message: context.condition.description?.trim() || '🎉 Спрацювала особлива умова!',
    };
  }
}

export const genericModifier = new GenericModifier();
