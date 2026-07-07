import { BASE_CONDITION_CODE } from '../config/constants';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class BaseModifier implements GrowthModifierHandler {
  code = BASE_CONDITION_CODE;

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const delta = Math.round(randomInRange(minDelta, maxDelta) * 100) / 100;
    return {
      delta,
      message: '',
    };
  }
}
