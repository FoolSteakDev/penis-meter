import { Schema, model, type HydratedDocument } from 'mongoose';

export type QuestKind = 'reach' | 'avoid' | 'hold';
export type QuestCategory = 'restraint' | 'precision' | 'position' | 'luck' | 'duel';

export interface QuestDocument {
  _id: Schema.Types.ObjectId;
  /** Стабільний код. НІКОЛИ не перейменовувати — це ключ у журналі призначень. */
  code: string;
  emoji: string;
  name: string;
  /** Повний опис — показується на екрані підтвердження. */
  description: string;
  category: QuestCategory;
  /** Код правила з quest.rules.ts. Визначає kind і семантику target/params. */
  rule: string;
  /** Ціль. Для 'avoid' ігнорується. */
  target: number;
  /** Параметри правила (мінімальна дельта, коди умов, години вікна...). */
  params: Record<string, unknown>;
  duration_minutes: number;
  reward_cm: number;
  penalty_cm: number;
  /** Скільки годин після ЗАКРИТТЯ квест недоступний цьому гравцю. 0 — одразу знову. */
  cooldown_hours: number;
  is_enabled: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export type QuestHydratedDocument = HydratedDocument<QuestDocument>;

const questSchema = new Schema<QuestDocument>(
  {
    code: { type: String, required: true, unique: true },
    emoji: { type: String, required: true, default: '🧭' },
    name: { type: String, required: true },
    description: { type: String, required: true, default: '' },
    category: {
      type: String,
      enum: ['restraint', 'precision', 'position', 'luck', 'duel'],
      required: true,
    },
    rule: { type: String, required: true },
    target: { type: Number, required: true, default: 1 },
    params: { type: Schema.Types.Mixed, default: {} },
    duration_minutes: { type: Number, required: true },
    reward_cm: { type: Number, required: true },
    penalty_cm: { type: Number, required: true },
    cooldown_hours: { type: Number, required: true, default: 24 },
    is_enabled: { type: Boolean, required: true, default: true },
    sort_order: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

questSchema.index({ is_enabled: 1, category: 1, sort_order: 1 });

export const QuestModel = model<QuestDocument>('Quest', questSchema);
