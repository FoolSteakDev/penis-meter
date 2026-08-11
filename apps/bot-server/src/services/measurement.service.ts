import {
  BASE_CONDITION_CODE,
  BASE_EXPERIENCE_PER_MEASUREMENT,
  EXPERIENCE_PER_STREAK_POINT,
  STREAK_GRACE_HOURS,
} from '../config/constants';
import { ConditionModel, type ConditionHydratedDocument } from '../database/models/condition.model';
import { UserModel, type UserHydratedDocument } from '../database/models/user.model';
import type { ThemeConditionOverride } from '../data/round-themes.data';
import type { ConditionDto } from '../dto/condition.dto';
import { envConfig } from '../config/env.config';
import { mapConditionDocumentToDto } from '../mappers/condition.mapper';
import { mapUserDocumentToDto } from '../mappers/user.mapper';
import { genericModifier } from '../modifiers/generic.modifier';
import { modifierRegistry } from '../modifiers/modifier.registry';
import type { GrowthModifierContext } from '../modifiers/growth-modifier.types';
import { getActiveTheme, getThemeOverrideForCondition } from './game-state.service';
import { ensureRoundInitialized } from './round-lifecycle.service';
import { nowUtc } from '../utils/date.util';
import { modeSign } from '../utils/mode.util';
import { roundCm } from '../utils/number.util';
import { createTtlCache } from '../utils/ttl-cache.util';
import { buildClampedValueUpdate } from '../utils/value-update.util';

/** Паралельний вимір того самого юзера вже пройшов CAS-перевірку раніше за цей. */
export class ConcurrentMeasurementError extends Error {
  constructor() {
    super('Concurrent measurement detected');
    this.name = 'ConcurrentMeasurementError';
  }
}

export interface MeasurementOutcome {
  previousValue: number;
  newValue: number;
  /** ФАКТИЧНО застосована дельта (newValue - previousValue). Відрізняється від
   *  накиданої модифікатором, коли спрацював кламп об межу режиму. */
  delta: number;
  /** true, якщо дельту зрізав кламп: гравець уперся в 0. */
  clamped: boolean;
  conditionName: string | null;
  message: string;
}

const CONDITIONS_CACHE_TTL_MS = 60 * 1000;
const CONDITIONS_CACHE_KEY = 'all';
const conditionsCache = createTtlCache<ConditionHydratedDocument[]>(CONDITIONS_CACHE_TTL_MS);

/**
 * performMeasurement виконується на кожен /metr (гарячий шлях), тому весь
 * список умов (включно з base) кешуємо разом і фільтруємо вже в памʼяті -
 * два окремі запити (enabled non-base + findOne base) на кожен вимір того
 * не варті.
 */
async function getAllConditions(): Promise<ConditionHydratedDocument[]> {
  return conditionsCache.resolve(CONDITIONS_CACHE_KEY, () => ConditionModel.find({}));
}

/** Викликати після createCondition/updateCondition/deleteCondition, щоб зміни в адмінці застосувались миттєво, а не за TTL. */
export function invalidateConditionsCache(): void {
  conditionsCache.invalidate(CONDITIONS_CACHE_KEY);
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
    chance: override.chanceOverride ?? condition.chance * (override.chanceMultiplier ?? 1),
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

  const allConditions = await getAllConditions();
  const conditionDocs = allConditions.filter((c) => c.is_enabled && c.code !== BASE_CONDITION_CODE);
  const shuffledConditions = shuffle(conditionDocs);

  const userDto = mapUserDocumentToDto(user);
  let resolved: { condition: (typeof conditionDocs)[number]; result: { delta: number; message: string } } | null =
    null;

  // Послідовна семантика (відомий компроміс, див. README "Умови росту"):
  // умови перетасовані й перебираються по черзі, спрацьовує ПЕРША, що
  // пройшла Math.random() < chance. Тому фактичний шанс умови трохи нижчий
  // за вказаний в адмінці (її може "перехопити" раніша умова в
  // перетасованому порядку), а сумарний шанс "хоч якась" спецумова
  // спрацює зростає з кожною новою увімкненою умовою. Чесний зважений
  // вибір - свідомо відкладена ідея (переналаштувало б увесь баланс гри).
  for (const conditionDoc of shuffledConditions) {
    // Умови без зареєстрованого handler'а (кастомні, створені через адмінку)
    // обробляються generic-фолбеком - простий рандом у [min, max].
    const handler = modifierRegistry.get(conditionDoc.code) ?? genericModifier;

    const themeOverride = getThemeOverrideForCondition(activeTheme, conditionDoc.code);
    const conditionDto = applyThemeOverride(mapConditionDocumentToDto(conditionDoc), themeOverride);

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
    const baseCondition = allConditions.find((c) => c.code === BASE_CONDITION_CODE) ?? null;
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
  // Дзеркальна інверсія режиму застосовується ПІСЛЯ модифікатора, а не всередині
  // нього: модифікатори лишаються нічого не знати про режим, а «критфейл для
  // буровика = удача» виходить сам собою зі зміни знаку.
  const delta = roundCm(resolved.result.delta * modeSign(user.mode));

  // Streak/досвід рахуємо ДО того, як перезапишемо last_measurement_at.
  const previousMeasurementAt = user.last_measurement_at;
  let nextStreak: number;
  if (previousMeasurementAt === null) {
    nextStreak = 1;
  } else {
    const gapHours = nowUtc().diff(previousMeasurementAt, 'hour', true);
    const onTime = gapHours <= envConfig.measurementCooldownHours + STREAK_GRACE_HOURS;
    nextStreak = onTime ? user.streak_current + 1 : 1;
  }
  const experienceGain = BASE_EXPERIENCE_PER_MEASUREMENT + nextStreak * EXPERIENCE_PER_STREAK_POINT;

  // Атомарний compare-and-swap: last_measurement_at у фільтрі одночасно
  // перевіряє кулдаун (значення, з якого стартував саме цей вимір) і захищає
  // від втрати даних при паралельних викликах performMeasurement/applyDuelDelta
  // над тим самим юзером (save() перезаписує весь документ без версіювання).
  // buildClampedValueUpdate рахує кламп об межу режиму (4.1/4.2) і синхронізує
  // season_growth/round_growth/round_best_delta ФАКТИЧНО застосованою величиною.
  const updated = await UserModel.findOneAndUpdate(
    { _id: user._id, last_measurement_at: previousMeasurementAt },
    buildClampedValueUpdate(delta, user.mode, {
      last_measurement_at: nowUtc().toDate(),
      streak_current: nextStreak,
      streak_best: Math.max(user.streak_best, nextStreak),
      round_measurement_count: { $add: ['$round_measurement_count', 1] },
      experience: { $add: ['$experience', experienceGain] },
      chats: { $setUnion: ['$chats', [chatId]] },
    }),
    { new: true },
  );

  if (!updated) {
    throw new ConcurrentMeasurementError();
  }

  const appliedDelta = roundCm(updated.value - previousValue);

  return {
    previousValue,
    newValue: updated.value,
    delta: appliedDelta,
    clamped: appliedDelta !== delta,
    conditionName: resolved.condition.code === BASE_CONDITION_CODE ? null : resolved.condition.name,
    message: resolved.result.message,
  };
}
