import type { UserMode } from '../database/models/user.model';

export type QuestEvent =
  | {
      type: 'measurement';
      chatId: number;
      /** Прогрес У БІК МЕТИ гравця (вже з modeSign, вже після клампу). */
      progressDelta: number;
      conditionCode: string | null;
      isNight: boolean;
      isPunctual: boolean;
      /** false — серія обірвалась цим виміром (запізнення). */
      streakKept: boolean;
      streakCurrent: number;
      mode: UserMode;
      hasTheme: boolean;
      /** Київський час виміру — для віконних правил. */
      kyivHour: number;
      kyivDay: string; // 'YYYY-MM-DD'
    }
  | {
      type: 'duel_finished';
      chatId: number;
      opponentTelegramId: number;
      won: boolean;
      stake: number;
      /** true — виклик ініціював саме цей гравець. */
      initiated: boolean;
      /** Прогрес опонента на момент дуелі — для «обжени сильнішого». */
      opponentProgress: number;
      selfProgress: number;
    }
  | { type: 'mode_switch'; chatId: number; to: UserMode }
  | { type: 'round_finished'; chatId: number; rank: number | null; roundGrowth: number };
