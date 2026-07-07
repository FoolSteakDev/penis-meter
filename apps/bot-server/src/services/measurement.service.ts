import { BASE_CONDITION_CODE } from '../config/constants';
import { ConditionModel } from '../database/models/condition.model';
import type { UserHydratedDocument } from '../database/models/user.model';
import { mapConditionDocumentToDto } from '../mappers/condition.mapper';
import { mapUserDocumentToDto } from '../mappers/user.mapper';
import { genericModifier } from '../modifiers/generic.modifier';
import { modifierRegistry } from '../modifiers/modifier.registry';
import type { GrowthModifierContext } from '../modifiers/growthModifier.types';
import { nowUtc } from '../utils/date.util';

export interface MeasurementOutcome {
  previousValue: number;
  newValue: number;
  delta: number;
  conditionName: string | null;
  message: string;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function performMeasurement(
  user: UserHydratedDocument,
  chatId: number,
): Promise<MeasurementOutcome> {
  const conditionDocs = await ConditionModel.find({
    is_enabled: true,
    code: { $ne: BASE_CONDITION_CODE },
  });
  const shuffledConditions = shuffle(conditionDocs);

  const userDto = mapUserDocumentToDto(user);
  let resolved: { condition: (typeof conditionDocs)[number]; result: { delta: number; message: string } } | null =
    null;

  for (const conditionDoc of shuffledConditions) {
    // Умови без зареєстрованого handler'а (кастомні, створені через адмінку)
    // обробляються generic-фолбеком - простий рандом у [min, max].
    const handler = modifierRegistry.get(conditionDoc.code) ?? genericModifier;

    const context: GrowthModifierContext = {
      user: userDto,
      chatId,
      condition: mapConditionDocumentToDto(conditionDoc),
    };

    const eligible = await handler.isEligible(context);
    if (!eligible) {
      continue;
    }

    if (Math.random() < conditionDoc.chance) {
      const result = await handler.apply(context);
      resolved = { condition: conditionDoc, result };
      break;
    }
  }

  if (!resolved) {
    const baseCondition = await ConditionModel.findOne({ code: BASE_CONDITION_CODE });
    if (!baseCondition) {
      throw new Error('Base condition is not seeded in the database');
    }
    const handler = modifierRegistry.get(BASE_CONDITION_CODE);
    if (!handler) {
      throw new Error('Base modifier handler is not registered');
    }
    const context: GrowthModifierContext = {
      user: userDto,
      chatId,
      condition: mapConditionDocumentToDto(baseCondition),
    };
    const result = await handler.apply(context);
    resolved = { condition: baseCondition, result };
  }

  const previousValue = user.value;
  const rawNewValue = previousValue + resolved.result.delta;
  const newValue = Math.round(rawNewValue * 100) / 100;

  user.value = newValue;
  user.last_measurement_at = nowUtc().toDate();
  if (!user.chats.includes(chatId)) {
    user.chats.push(chatId);
  }
  await user.save();

  return {
    previousValue,
    newValue,
    delta: resolved.result.delta,
    conditionName: resolved.condition.code === BASE_CONDITION_CODE ? null : resolved.condition.name,
    message: resolved.result.message,
  };
}
