import { BASE_CONDITION_CODE } from '../config/constants';
import { rollBaseDelta } from '../utils/delta-roll.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growth-modifier.types';

export class BaseModifier implements GrowthModifierHandler {
  code = BASE_CONDITION_CODE;

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const delta = rollBaseDelta(context.condition);
    return {
      delta,
      message: '',
    };
  }
}
