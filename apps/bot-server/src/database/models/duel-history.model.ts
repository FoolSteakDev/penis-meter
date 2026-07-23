import { Schema, model, type HydratedDocument } from 'mongoose';

/** Результат КОЖНОЇ прийнятої дуелі - для /duel_history та особистої історії в /status. */
export interface DuelHistoryDocument {
  _id: Schema.Types.ObjectId;
  chat_id: number;
  challenger_telegram_id: number;
  target_telegram_id: number;
  winner_telegram_id: number;
  delta: number;
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
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

duelHistorySchema.index({ chat_id: 1, created_at: -1 });
duelHistorySchema.index({ challenger_telegram_id: 1, created_at: -1 });
duelHistorySchema.index({ target_telegram_id: 1, created_at: -1 });

export const DuelHistoryModel = model<DuelHistoryDocument>('DuelHistory', duelHistorySchema);
