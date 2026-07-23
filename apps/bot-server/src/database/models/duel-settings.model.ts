import { Schema, model, type HydratedDocument } from 'mongoose';

/** Один "стрік" квесту "виграй N дуелей за раунд" - ціль перемог і нагорода см за її досягнення. */
export interface DuelQuestTarget {
  target: number;
  reward_cm: number;
}

/** Singleton-документ (завжди один) - адмін-налаштування дуелей (вкладка "Налаштування"). */
export interface DuelSettingsDocument {
  _id: Schema.Types.ObjectId;
  min_delta: number;
  max_delta: number;
  is_enabled: boolean;
  quest_targets: DuelQuestTarget[];
  created_at: Date;
  updated_at: Date;
}

export type DuelSettingsHydratedDocument = HydratedDocument<DuelSettingsDocument>;

const duelQuestTargetSchema = new Schema<DuelQuestTarget>(
  {
    target: { type: Number, required: true },
    reward_cm: { type: Number, required: true },
  },
  { _id: false },
);

const DEFAULT_QUEST_TARGETS: DuelQuestTarget[] = [
  { target: 1, reward_cm: 2 },
  { target: 2, reward_cm: 4 },
  { target: 3, reward_cm: 7 },
  { target: 5, reward_cm: 12 },
];

const duelSettingsSchema = new Schema<DuelSettingsDocument>(
  {
    min_delta: { type: Number, required: true, default: 1 },
    max_delta: { type: Number, required: true, default: 5 },
    is_enabled: { type: Boolean, required: true, default: true },
    quest_targets: { type: [duelQuestTargetSchema], default: () => DEFAULT_QUEST_TARGETS },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const DuelSettingsModel = model<DuelSettingsDocument>('DuelSettings', duelSettingsSchema);
