export const DEFAULT_MEASUREMENT_COOLDOWN_HOURS = 4;

export const DEFAULT_STARTING_VALUE_CM = 10;

export const RATING_LIMIT = 10;

export const BASE_CONDITION_CODE = "base";

// День 0 сезону/раунду. Один раз зафіксована дата - все інше (номер
// раунду/сезону) виводиться з неї чистою модульною арифметикою.
export const SEASON_START_DATE = "2026-07-13T00:00:00.000Z";

export const ROUND_LENGTH_DAYS = 7;

export const ROUNDS_PER_SEASON = 4;

/** Скільки завершених раундів максимум анонсуємо після простою - решту доганяємо мовчки. */
export const MAX_ANNOUNCED_CATCHUP_ROUNDS = 1;

// --- Streak/досвід ---

/** Скільки годин ПОНАД кулдаун ще вважається "вчасним" виміром (не запізненням). */
export const STREAK_GRACE_HOURS = 1;

export const BASE_EXPERIENCE_PER_MEASUREMENT = 1;

export const EXPERIENCE_PER_STREAK_POINT = 0.5;

// --- Дуелі (/duel) ---
// Строк дії виклику (challenge_ttl_minutes) і ліміт одночасних викликів
// (max_pending_challenges) - адмін-налаштовувані, див. DuelSettingsModel, а
// не константи тут.

/** Скільки останніх дуелей показувати в /duel_history та в особистій історії з /status. */
export const DUEL_HISTORY_LIMIT = 10;

/** Скільки живе чернетка виклику між вибором опонента і вибором ставки. */
export const DUEL_DRAFT_TTL_MINUTES = 10;

/** 4 рядки по 2 кнопки на сторінку вибору опонента. */
export const DUEL_OPPONENTS_PER_PAGE = 8;

/** Після скількох невдалих спроб ввести ставку чернетка скасовується. */
export const DUEL_STAKE_INPUT_MAX_ATTEMPTS = 3;

// --- Режим гравця (grow/drill) ---

/** Мінімальний проміжок між змінами режиму. Захист від «копаю на критфейлах,
 *  росту на критуспіхах»: кулдаун виміру 4 год, тож у вікні ~6 вимірів. */
export const MODE_SWITCH_COOLDOWN_HOURS = 24;

// --- Досягнення ---

/** Вікно після кулдауну, у яке вимір рахується «секунда в секунду» (досягнення `punctual`). */
export const PUNCTUAL_WINDOW_MINUTES = 10;

/** Скільки разів переоцінювати досягнення після видачі нагороди (нагорода може відкрити наступний рівень). */
export const ACHIEVEMENT_CASCADE_PASSES = 3;
