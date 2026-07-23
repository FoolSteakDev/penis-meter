export const DEFAULT_MEASUREMENT_COOLDOWN_HOURS = 4;

export const DEFAULT_STARTING_VALUE_CM = 10;

export const RATING_LIMIT = 10;

export const BASE_CONDITION_CODE = "base";

// День 0 сезону/раунду. Один раз зафіксована дата - все інше (номер
// раунду/сезону) виводиться з неї чистою модульною арифметикою.
export const SEASON_START_DATE = "2026-07-13T00:00:00.000Z";

export const ROUND_LENGTH_DAYS = 7;

export const ROUNDS_PER_SEASON = 4;

// --- Streak/досвід ---

/** Скільки годин ПОНАД кулдаун ще вважається "вчасним" виміром (не запізненням). */
export const STREAK_GRACE_HOURS = 1;

export const BASE_EXPERIENCE_PER_MEASUREMENT = 1;

export const EXPERIENCE_PER_STREAK_POINT = 0.5;

// --- Щотижневі квести "для кожного" (п.4) ---

/** [поріг вимірів за раунд, бонус см], відсортовано за зростанням порогу. */
export const MEASUREMENT_COUNT_QUEST_TIERS: [
  threshold: number,
  rewardCm: number,
][] = [
  [12, 2],
  [24, 5],
  [36, 9],
  [42, 15],
];

/** Нагорода за вхід у топ-3 чату (за value), не будучи там на старт раунду. */
export const CLIMBER_QUEST_REWARD_CM = 5;

// --- Індивідуальні квести (п.5, Quest-сутність) ---

/** Шанс, що конкретний юзер отримає індивідуальний квест на старт раунду. */
export const INDIVIDUAL_QUEST_CHANCE = 0.4;

// --- Дуелі (/duel) ---
// Стріки квесту "виграй N дуелей" (ціль + нагорода) - адмін-налаштовувані,
// див. DuelSettingsModel.quest_targets, а не константи тут.

/** Скільки хвилин виклик на дуель чекає на відповідь опонента, перш ніж протермінуватись. */
export const DUEL_CHALLENGE_TTL_MINUTES = 10;

/** Скільки останніх дуелей показувати в /duel_history та в особистій історії з /status. */
export const DUEL_HISTORY_LIMIT = 10;
