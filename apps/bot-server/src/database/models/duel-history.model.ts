import { Schema, model, type HydratedDocument } from 'mongoose';

/** Результат КОЖНОЇ прийнятої дуелі - для /duel_history та особистої історії в /status. */
export interface DuelHistoryDocument {
  _id: Schema.Types.ObjectId;
  chat_id: number;
  challenger_telegram_id: number;
  target_telegram_id: number;
  winner_telegram_id: number;
  delta: number;
  /** Чи переміг саме той, хто викликав. Дублює winner_telegram_id, але робить
   *  запит "чи є перевага в ініціатора" однорядковим агрегейтом. */
  challenger_won: boolean | null;
  /** Заявлена ставка на момент фіналізації - delta вже "фактично списана"
   *  після перевалідації, і за нею не видно, чи ставку зрізали. */
  requested_stake: number | null;
  /** Бонус за квест, доданий переможцю понад ставку - щоб аналіз балансу
   *  не плутав його з виграшем у дуелі. */
  quest_reward: number | null;
  /** Чи ця дуель стартувала з кнопки "Реванш" (rematch_of у DuelChallenge). Для scripts/duel-stats.ts. */
  is_rematch: boolean;
  created_at: Date;
  updated_at: Date;
}

export type DuelHistoryHydratedDocument = HydratedDocument<DuelHistoryDocument>;

const duelHistorySchema = new Schema<DuelHistoryDocument>(
  {
    chat_id: { type: Number, required: true },
    challenger_telegram_id: { type: Number, required: true },
    target_telegram_id: { type: Number, required: true },
    winner_telegram_id: { type: Number, required: true },
    delta: { type: Number, required: true },
    challenger_won: { type: Boolean, default: null },
    requested_stake: { type: Number, default: null },
    quest_reward: { type: Number, default: null },
    is_rematch: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

duelHistorySchema.index({ chat_id: 1, created_at: -1 });
duelHistorySchema.index({ challenger_telegram_id: 1, created_at: -1 });
duelHistorySchema.index({ target_telegram_id: 1, created_at: -1 });

export const DuelHistoryModel = model<DuelHistoryDocument>('DuelHistory', duelHistorySchema);
