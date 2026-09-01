import { connectMongo } from './mongo.connection';
import { ConditionModel } from './models/condition.model';
import { DuelSettingsModel } from './models/duel-settings.model';
import { QuestModel } from './models/quest.model';
import { QUEST_SEED } from '../quests/quest-seed.data';

interface SeedCondition {
  code: string;
  name: string;
  description: string;
  chance: number;
  min_delta: number;
  max_delta: number;
  is_protected: boolean;
  config?: Record<string, unknown>;
}

const SEED_CONDITIONS: SeedCondition[] = [
  {
    code: 'base',
    name: 'Звичайний вимір',
    description: 'Стандартний вимір без особливих умов.',
    chance: 1,
    min_delta: -3,
    max_delta: 5,
    is_protected: true,
  },
  {
    code: 'weather',
    name: 'Погода',
    description: 'Результат залежить від погоди у випадковому місті світу.',
    chance: 0.2,
    min_delta: -4,
    max_delta: 8,
    is_protected: false,
  },
  {
    code: 'weekend',
    name: 'Вихідний бонус',
    description: 'Додатковий бонус у вихідний день користувача (за його особистим графіком роботи).',
    chance: 0.33,
    min_delta: 2,
    max_delta: 6,
    is_protected: true,
  },
  {
    code: 'critical',
    name: 'Критичний результат',
    description: 'Рідкісний критичний успіх або провал.',
    chance: 0.05,
    min_delta: -15,
    max_delta: 15,
    is_protected: false,
  },
  {
    code: 'currency',
    name: 'Курс валют',
    description: 'Результат залежить від зміни курсу USD/UAH за останню добу (НБУ).',
    chance: 0.15,
    min_delta: -3,
    max_delta: 5,
    is_protected: false,
  },
  {
    code: 'moon_phase',
    name: 'Фаза Місяця',
    description: 'Чим ближче до повного місяця, тим сильніший "вовкулаче" бонус.',
    chance: 0.15,
    min_delta: -2,
    max_delta: 6,
    is_protected: false,
  },
  {
    code: 'crypto',
    name: 'Курс криптовалюти',
    description: 'Результат залежить від зміни курсу BTC за останню годину.',
    chance: 0.15,
    min_delta: -3,
    max_delta: 6,
    is_protected: false,
  },
  {
    code: 'historical_day',
    name: 'День в історії',
    description: 'Спрацьовує лише у дні з відомою історичною подією.',
    chance: 0.6,
    min_delta: 1,
    max_delta: 5,
    is_protected: false,
  },
  {
    code: 'chat_activity',
    name: 'Активність чату',
    description: 'Невеликий груповий бонус, якщо чат був дуже активним останню годину.',
    chance: 0.2,
    min_delta: 1,
    max_delta: 3,
    is_protected: false,
    config: { messageThreshold: 10 },
  },
];

/**
 * Колекція `quests` - та сама, що дропнув database/drop-quests.ts при демонтажі
 * старої Quest-сутності. Схема інша й несумісна - якщо в колекції лишились
 * документи без поля `rule` (залишки старої моделі), сид падає з поясненням
 * замість того, щоб мовчки домішати їх до нових.
 */
async function seedQuests(): Promise<void> {
  const legacy = await QuestModel.collection.countDocuments({ rule: { $exists: false } });
  if (legacy > 0) {
    throw new Error(`Колекція quests містить ${legacy} документів старої схеми - почисти перед сидом`);
  }

  for (const [index, quest] of QUEST_SEED.entries()) {
    await QuestModel.updateOne(
      { code: quest.code },
      {
        $set: {
          emoji: quest.emoji,
          name: quest.name,
          description: quest.description,
          category: quest.category,
          rule: quest.rule,
          target: quest.target,
          params: quest.params,
          duration_minutes: quest.duration_minutes,
          reward_cm: quest.reward_cm,
          penalty_cm: quest.penalty_cm,
          cooldown_hours: quest.cooldown_hours,
          sort_order: index,
        },
        // is_enabled НЕ перебиваємо при апдейті - якщо адмін вимкнув квест
        // вручну, повторний сид не має мовчки повертати його назад.
        $setOnInsert: { is_enabled: true },
      },
      { upsert: true },
    );
  }

  console.log(`[seed] ensured ${QUEST_SEED.length} quests exist`);
}

async function seed(): Promise<void> {
  await connectMongo();

  for (const condition of SEED_CONDITIONS) {
    await ConditionModel.updateOne(
      { code: condition.code },
      {
        $setOnInsert: {
          code: condition.code,
          name: condition.name,
          description: condition.description,
          is_enabled: true,
          chance: condition.chance,
          min_delta: condition.min_delta,
          max_delta: condition.max_delta,
          config: condition.config ?? {},
          is_protected: condition.is_protected,
        },
      },
      { upsert: true },
    );
  }

  console.log(`[seed] ensured ${SEED_CONDITIONS.length} conditions exist`);

  await DuelSettingsModel.updateOne(
    {},
    {
      $setOnInsert: {
        min_delta: 1,
        max_delta: 5,
        is_enabled: true,
      },
    },
    { upsert: true },
  );
  console.log('[seed] ensured duel settings exist');

  await seedQuests();

  process.exit(0);
}

seed().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
