import { Schema, model, type HydratedDocument } from 'mongoose';

/** Singleton-документ (завжди один) - адмін-налаштування дуелей (вкладка "Налаштування"). */
export interface DuelSettingsDocument {
  _id: Schema.Types.ObjectId;
  min_delta: number;
  max_delta: number;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export type DuelSettingsHydratedDocument = HydratedDocument<DuelSettingsDocument>;

const duelSettingsSchema = new Schema<DuelSettingsDocument>(
  {
    min_delta: { type: Number, required: true, default: 1 },
    max_delta: { type: Number, required: true, default: 5 },
    is_enabled: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const DuelSettingsModel = model<DuelSettingsDocument>('DuelSettings', duelSettingsSchema);
