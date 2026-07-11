import { rollBaseDelta } from '../utils/deltaRoll.util';
import { isRestDayForUser } from '../utils/workSchedule.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

export class WeekendModifier implements GrowthModifierHandler {
  code = 'weekend';

  async isEligible(context: GrowthModifierContext): Promise<boolean> {
    return isRestDayForUser(context.user.work);
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const delta = rollBaseDelta(context.condition);
    return {
      delta,
      message: 'Вихідний день - природа сприяє росту! 🎉',
    };
  }
}
