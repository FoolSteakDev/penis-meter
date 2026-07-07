import { connectMongo } from './mongo.connection';
import { ConditionModel } from './models/condition.model';

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
    description: 'Додатковий бонус по вихідних (субота, неділя).',
    chance: 0.15,
    min_delta: 2,
    max_delta: 6,
    is_protected: false,
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
    code: 'duel',
    name: 'Дуель',
    description: 'Випадковий учасник чату - частина приросту переходить від одного до іншого.',
    chance: 0.08,
    min_delta: 1,
    max_delta: 5,
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
    config: { messageThreshold: 20 },
  },
];

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
  process.exit(0);
}

seed().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
