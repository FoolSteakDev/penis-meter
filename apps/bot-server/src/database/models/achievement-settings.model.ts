import { Schema, model, type HydratedDocument } from 'mongoose';

/** Singleton-документ (завжди один) - адмін-налаштування системи досягнень. */
export interface AchievementSettingsDocument {
  _id: Schema.Types.ObjectId;
  /** false - лічильники йдуть, але рівні не відкриваються і нагороди не видаються. */
  is_enabled: boolean;
  /** false - рівні відкриваються мовчки, видно тільки в /achievements. */
  announce_enabled: boolean;
  /** 0..5, дефолт 1 - ручка балансу без правки коду. */
  reward_multiplier: number;
  created_at: Date;
  updated_at: Date;
}

export type AchievementSettingsHydratedDocument = HydratedDocument<AchievementSettingsDocument>;

const achievementSettingsSchema = new Schema<AchievementSettingsDocument>(
  {
    is_enabled: { type: Boolean, required: true, default: true },
    announce_enabled: { type: Boolean, required: true, default: true },
    reward_multiplier: { type: Number, required: true, default: 1 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const AchievementSettingsModel = model<AchievementSettingsDocument>(
  'AchievementSettings',
  achievementSettingsSchema,
);
