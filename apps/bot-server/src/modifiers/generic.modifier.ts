import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

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
    const { minDelta, maxDelta, name } = context.condition;
    const delta = Math.round(randomInRange(minDelta, maxDelta) * 100) / 100;
    return {
      delta,
      message: `${name}!`,
    };
  }
}

export const genericModifier = new GenericModifier();
