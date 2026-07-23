export interface ThemeConditionOverride {
  conditionCode: string;
  chanceMultiplier?: number;
  /** Абсолютний шанс замість множника - так адмін-керовані теми (round.model.ts) задають просту тему без мультиплікаторів. Має пріоритет над chanceMultiplier. */
  chanceOverride?: number;
  minDeltaOverride?: number;
  maxDeltaOverride?: number;
}

export interface RoundTheme {
  code: string;
  name: string;
  description: string;
  overrides: ThemeConditionOverride[];
}

/**
 * Пул тем для тематичних раундів. Одна тема обирається чистим рандомом на
 * старт кожного раунду (див. game-state.service.ts::ensureRoundInitialized).
 * Оверрайди діють лише на час раунду й не змінюють самі `conditions` у БД.
 */
export const ROUND_THEMES: RoundTheme[] = [
  {
    code: 'lucky_week',
    name: 'Тиждень удачі',
    description: 'Шанс критичного результату подвоєний цього тижня!',
    overrides: [{ conditionCode: 'critical', chanceMultiplier: 2 }],
  },
  {
    code: 'weather_week',
    name: 'Тиждень погоди',
    description: 'Погода впливає на результат значно сильніше, ніж зазвичай.',
    overrides: [
      { conditionCode: 'weather', chanceMultiplier: 1.8, minDeltaOverride: -6, maxDeltaOverride: 12 },
    ],
  },
  {
    code: 'weekend_afterparty',
    name: 'Афтепаті вихідних',
    description: 'Вихідний бонус цього тижня відчутно щедріший.',
    overrides: [
      { conditionCode: 'weekend', chanceMultiplier: 1.5, minDeltaOverride: 3, maxDeltaOverride: 10 },
    ],
  },
  {
    code: 'unlucky_week',
    name: 'Тиждень невезіння',
    description: 'Цього тижня удача явно не на твоєму боці...',
    overrides: [
      { conditionCode: 'critical', chanceMultiplier: 1.5 },
      { conditionCode: 'base', minDeltaOverride: -6, maxDeltaOverride: 2 },
    ],
  },
];
