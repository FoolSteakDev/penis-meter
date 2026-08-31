import { Schema, model, type HydratedDocument } from 'mongoose';

export interface AchievementProgressDocument {
  _id: Schema.Types.ObjectId;
  telegram_id: number;
  /** code досягнення -> відкритий рівень 0..4. Рівень 0 у мапі не зберігаємо. */
  levels: Map<string, number>;
  /** Сирі лічильники подій. Ключі — див. COUNTER_KEYS у achievement.types.ts. */
  counters: Map<string, number>;
  /** code умови росту -> скільки разів вона спрацювала в цього гравця. */
  condition_hits: Map<string, number>;
  /** Сума виданих нагород (см, у бік мети гравця) — для аудиту балансу. */
  awarded_cm: number;
  created_at: Date;
  updated_at: Date;
}

export type AchievementProgressHydratedDocument = HydratedDocument<AchievementProgressDocument>;

const achievementProgressSchema = new Schema<AchievementProgressDocument>(
  {
    telegram_id: { type: Number, required: true, unique: true },
    levels: { type: Map, of: Number, default: () => new Map() },
    counters: { type: Map, of: Number, default: () => new Map() },
    condition_hits: { type: Map, of: Number, default: () => new Map() },
    awarded_cm: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const AchievementProgressModel = model<AchievementProgressDocument>(
  'AchievementProgress',
  achievementProgressSchema,
);
