import { Schema, model, type HydratedDocument } from 'mongoose';

/** Singleton-документ (завжди один) - адмін-налаштування дуелей (вкладка "Налаштування"). */
export interface DuelSettingsDocument {
  _id: Schema.Types.ObjectId;
  min_delta: number;
  max_delta: number;
  is_enabled: boolean;
  /** Скільки хвилин виклик чекає на відповідь опонента, перш ніж протермінуватись. */
  challenge_ttl_minutes: number;
  /** Скільки pending-викликів одночасно може тримати один гравець. */
  max_pending_challenges: number;
  created_at: Date;
  updated_at: Date;
}

export type DuelSettingsHydratedDocument = HydratedDocument<DuelSettingsDocument>;

const duelSettingsSchema = new Schema<DuelSettingsDocument>(
  {
    min_delta: { type: Number, required: true, default: 1 },
    max_delta: { type: Number, required: true, default: 5 },
    is_enabled: { type: Boolean, required: true, default: true },
    challenge_ttl_minutes: { type: Number, required: true, default: 720 },
    max_pending_challenges: { type: Number, required: true, default: 5 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const DuelSettingsModel = model<DuelSettingsDocument>('DuelSettings', duelSettingsSchema);
