import { Schema, model, type HydratedDocument } from 'mongoose';

/** Поки єдиний тип - перемоги в дуелях. Нові типи додаються сюди пізніше. */
export type QuestType = 'duel_wins';

export interface QuestDocument {
  _id: Schema.Types.ObjectId;
  telegram_id: number;
  round_number: number;
  type: QuestType;
  target: number;
  progress: number;
  is_completed: boolean;
  reward_applied: boolean;
  /** Дані, специфічні для типу квеста (напр. буст шансу для duel_wins). */
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type QuestHydratedDocument = HydratedDocument<QuestDocument>;

const questSchema = new Schema<QuestDocument>(
  {
    telegram_id: { type: Number, required: true },
    round_number: { type: Number, required: true },
    type: { type: String, required: true },
    target: { type: Number, required: true },
    progress: { type: Number, required: true, default: 0 },
    is_completed: { type: Boolean, required: true, default: false },
    reward_applied: { type: Boolean, required: true, default: false },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

questSchema.index({ telegram_id: 1, round_number: 1, type: 1 });

export const QuestModel = model<QuestDocument>('Quest', questSchema);
