import type { UserDocument } from '../database/models/user.model';
import type { AchievementProgressDocument } from '../database/models/achievement-progress.model';

export type AchievementCategory = 'measure' | 'growth' | 'duel' | 'condition' | 'social' | 'meta';

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  measure: '📏 Виміри',
  growth: '📈 Прогрес',
  duel: '⚔️ Дуелі',
  condition: '🎲 Умови',
  social: '🏅 Рейтинги',
  meta: '🎭 Різне',
};

export interface AchievementMetricContext {
  user: UserDocument;
  progress: AchievementProgressDocument;
}

export interface AchievementDefinition {
  /** Стабільний код. НІКОЛИ не перейменовувати — це ключ у levels-мапі гравців. */
  code: string;
  emoji: string;
  name: string;
  /** Як отримати — один рядок, показується в списку під назвою. */
  hint: string;
  category: AchievementCategory;
  unit: 'count' | 'cm' | 'days';
  /** 4 пороги за зростанням. */
  thresholds: readonly [number, number, number, number];
  /** Нагорода в см за КОЖЕН рівень. Діапазони: I 3–5, II 8–10, III 15–20, IV 40–50. */
  rewards: readonly [number, number, number, number];
  /** Поточне значення метрики. Чиста функція від двох документів — без запитів у БД. */
  value: (ctx: AchievementMetricContext) => number;
}
