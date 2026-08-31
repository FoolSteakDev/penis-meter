import { formatCm } from '../utils/number.util';
import { ACHIEVEMENTS_BY_CODE } from './achievement.registry';
import { ROMAN, type AchievementUnlock } from './achievement.engine';

const MAX_ANNOUNCE_LINES = 10;

/**
 * 🎖 Petro відкриває досягнення:
 * 📏 Метроман II — Роби виміри → +10 см
 * 🔥 Серія перемог I — Вигравай дуелі поспіль → +5 см
 */
export function formatUnlocks(label: string, unlocks: AchievementUnlock[]): string {
  const allLines = unlocks.map((unlock) => {
    const hint = ACHIEVEMENTS_BY_CODE.get(unlock.code)?.hint ?? '';
    return `${unlock.emoji} ${unlock.name} ${ROMAN[unlock.toLevel]} — ${hint} → +${formatCm(unlock.rewardCm)} см`;
  });

  const visible = allLines.slice(0, MAX_ANNOUNCE_LINES);
  const hiddenCount = allLines.length - visible.length;
  if (hiddenCount > 0) {
    visible.push(`…та ще ${hiddenCount} рівнів`);
  }

  return [`🎖 ${label} відкриває досягнення:`, ...visible].join('\n');
}
