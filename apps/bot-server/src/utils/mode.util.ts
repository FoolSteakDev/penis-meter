import type { UserMode } from '../database/models/user.model';

/** +1 для 'grow', -1 для 'drill'. Множник для КОЖНОЇ дельти, що йде в value. */
export function modeSign(mode: UserMode): number {
  return mode === 'drill' ? -1 : 1;
}

/** Скільки гравець просунувся В БІК СВОЄЇ МЕТИ. Для 'grow' = value,
 *  для 'drill' = -value. Використовується для ставок і рейтингів. */
export function progress(value: number, mode: UserMode): number {
  return value * modeSign(mode);
}

export const MODE_LABELS: Record<UserMode, string> = {
  grow: '🍆 Ростити хуй',
  drill: '🕳 Бурити скважину',
};
