import { Schema, model, type HydratedDocument } from 'mongoose';

export type DuelChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * Тимчасовий запис виклику на дуель - живе від /duel до відповіді опонента
 * (accept/decline) або TTL-протермінування (`expires_at`, автовидалення
 * Mongo-індексом). Не плутати з duel-history.model.ts - це лише сам виклик,
 * історія пише вже РЕЗУЛЬТАТ прийнятої дуелі.
 */
export interface DuelChallengeDocument {
  _id: Schema.Types.ObjectId;
  chat_id: number;
  challenger_telegram_id: number;
  target_telegram_id: number;
  status: DuelChallengeStatus;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export type DuelChallengeHydratedDocument = HydratedDocument<DuelChallengeDocument>;

const duelChallengeSchema = new Schema<DuelChallengeDocument>(
  {
    chat_id: { type: Number, required: true },
    challenger_telegram_id: { type: Number, required: true },
    target_telegram_id: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      required: true,
      default: 'pending',
    },
    expires_at: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

duelChallengeSchema.index({ challenger_telegram_id: 1, status: 1 });
duelChallengeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const DuelChallengeModel = model<DuelChallengeDocument>('DuelChallenge', duelChallengeSchema);
