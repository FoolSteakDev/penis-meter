import type { QuestCategory } from '../database/models/quest.model';

export const QUEST_CATEGORY_ORDER: QuestCategory[] = ['restraint', 'precision', 'position', 'luck', 'duel'];

export const QUEST_CATEGORY_LABELS: Record<QuestCategory, string> = {
  restraint: '🧘 Утримання',
  precision: '⏱ Точність',
  position: '🏆 Позиція',
  luck: '🎲 Удача',
  duel: '⚔️ Дуельні',
};
