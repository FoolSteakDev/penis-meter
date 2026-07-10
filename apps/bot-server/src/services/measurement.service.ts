import {
  BASE_CONDITION_CODE,
  BASE_EXPERIENCE_PER_MEASUREMENT,
  EXPERIENCE_PER_STREAK_POINT,
  STREAK_GRACE_HOURS,
} from '../config/constants';
import { ConditionModel } from '../database/models/condition.model';
import type { UserHydratedDocument } from '../database/models/user.model';
import type { ThemeConditionOverride } from '../data/roundThemes.data';
import type { ConditionDto } from '../dto/condition.dto';
import { envConfig } from '../config/env.config';
import { mapConditionDocumentToDto } from '../mappers/condition.mapper';
import { mapUserDocumentToDto } from '../mappers/user.mapper';
import { genericModifier } from '../modifiers/generic.modifier';
import { modifierRegistry } from '../modifiers/modifier.registry';
import type { GrowthModifierContext } from '../modifiers/growthModifier.types';
import { getActiveTheme, getThemeOverrideForCondition } from './gameState.service';
import { getDuelChanceOverrideForUser } from './quest.service';
import { ensureRoundInitialized } from './roundLifecycle.service';
import { nowUtc } from '../utils/date.util';
import { getCurrentRoundNumber } from '../utils/seasonRound.util';

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

/** Дельта/шанс з активної теми раунду (див. п.3 ТЗ "Тематичні раунди"), якщо є. */
function applyThemeOverride(condition: ConditionDto, override: ThemeConditionOverride | null): ConditionDto {
  if (!override) {
    return condition;
  }
  return {
    ...condition,
    chance: condition.chance * (override.chanceMultiplier ?? 1),
    minDelta: override.minDeltaOverride ?? condition.minDelta,
    maxDelta: override.maxDeltaOverride ?? condition.maxDelta,
  };
}

export async function performMeasurement(
  user: UserHydratedDocument,
  chatId: number,
): Promise<MeasurementOutcome> {
  const gameState = await ensureRoundInitialized();
  const activeTheme = getActiveTheme(gameState);
  const roundNumber = getCurrentRoundNumber();

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

    const themeOverride = getThemeOverrideForCondition(activeTheme, conditionDoc.code);
    let conditionDto = applyThemeOverride(mapConditionDocumentToDto(conditionDoc), themeOverride);

    // Персональний квест "виграй N дуелей" (п.5) перебиває навіть тему -
    // це фіксований особистий шанс, а не множник.
    if (conditionDoc.code === 'duel') {
      const personalChance = await getDuelChanceOverrideForUser(user.telegram_id, roundNumber);
      if (personalChance !== null) {
        conditionDto = { ...conditionDto, chance: personalChance };
      }
    }

    const context: GrowthModifierContext = {
      user: userDto,
      chatId,
      condition: conditionDto,
    };

    const eligible = await handler.isEligible(context);
    if (!eligible) {
      continue;
    }

    if (Math.random() < conditionDto.chance) {
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
    const themeOverride = getThemeOverrideForCondition(activeTheme, BASE_CONDITION_CODE);
    const conditionDto = applyThemeOverride(mapConditionDocumentToDto(baseCondition), themeOverride);
    const context: GrowthModifierContext = {
      user: userDto,
      chatId,
      condition: conditionDto,
    };
    const result = await handler.apply(context);
    resolved = { condition: baseCondition, result };
  }

  const previousValue = user.value;
  const rawNewValue = previousValue + resolved.result.delta;
  const newValue = Math.round(rawNewValue * 100) / 100;

  // Streak/досвід рахуємо ДО того, як перезапишемо last_measurement_at.
  const previousMeasurementAt = user.last_measurement_at;
  if (previousMeasurementAt === null) {
    user.streak_current = 1;
  } else {
    const gapHours = nowUtc().diff(previousMeasurementAt, 'hour', true);
    const onTime = gapHours <= envConfig.measurementCooldownHours + STREAK_GRACE_HOURS;
    user.streak_current = onTime ? user.streak_current + 1 : 1;
  }
  if (user.streak_current > user.streak_best) {
    user.streak_best = user.streak_current;
  }
  const experienceGain = BASE_EXPERIENCE_PER_MEASUREMENT + user.streak_current * EXPERIENCE_PER_STREAK_POINT;
  user.experience = Math.round((user.experience + experienceGain) * 100) / 100;

  user.value = newValue;
  user.season_growth = Math.round((user.season_growth + resolved.result.delta) * 100) / 100;
  user.round_growth = Math.round((user.round_growth + resolved.result.delta) * 100) / 100;
  user.round_measurement_count += 1;
  if (user.round_best_delta === null || resolved.result.delta > user.round_best_delta) {
    user.round_best_delta = resolved.result.delta;
  }
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
