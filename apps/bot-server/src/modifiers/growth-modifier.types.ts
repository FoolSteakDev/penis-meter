import type { UserDto } from '../dto/user.dto';
import type { ConditionDto } from '../dto/condition.dto';

export interface GrowthModifierContext {
  user: UserDto;
  chatId: number;
  condition: ConditionDto;
}

export interface GrowthModifierResult {
  delta: number;
  message: string;
}

export interface GrowthModifierHandler {
  code: string;
  isEligible(context: GrowthModifierContext): Promise<boolean>;
  apply(context: GrowthModifierContext): Promise<GrowthModifierResult>;
}
