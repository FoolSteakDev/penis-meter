import { Schema, model, type HydratedDocument } from 'mongoose';

/** Singleton-документ (завжди один) — адмін-налаштування системи квестів. */
export interface QuestSettingsDocument {
  _id: Schema.Types.ObjectId;
  /** false — меню квестів каже «тимчасово вимкнено». */
  is_enabled: boolean;
  /** false — старт/фініш квестів не анонсуються в чат. */
  announce_enabled: boolean;
  /** 0..5, дефолт 1 — ручка балансу без правки коду. */
  reward_multiplier: number;
  /** 0..5, дефолт 1. */
  penalty_multiplier: number;
  /** 0 = без обмежень (дефолт). */
  max_active_quests: number;
  /** 0 = без нагадувань, дефолт 30. */
  reminder_before_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export type QuestSettingsHydratedDocument = HydratedDocument<QuestSettingsDocument>;

const questSettingsSchema = new Schema<QuestSettingsDocument>(
  {
    is_enabled: { type: Boolean, required: true, default: true },
    announce_enabled: { type: Boolean, required: true, default: true },
    reward_multiplier: { type: Number, required: true, default: 1 },
    penalty_multiplier: { type: Number, required: true, default: 1 },
    max_active_quests: { type: Number, required: true, default: 0 },
    reminder_before_minutes: { type: Number, required: true, default: 30 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const QuestSettingsModel = model<QuestSettingsDocument>('QuestSettings', questSettingsSchema);
