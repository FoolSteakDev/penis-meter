import { Schema, model, type HydratedDocument } from 'mongoose';

export type DeltaMode = 'range' | 'fixed_list';

export interface ConditionDocument {
  _id: Schema.Types.ObjectId;
  code: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  chance: number;
  min_delta: number;
  max_delta: number;
  delta_mode: DeltaMode;
  fixed_values: number[];
  config: Record<string, unknown>;
  is_protected: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ConditionHydratedDocument = HydratedDocument<ConditionDocument>;

const conditionSchema = new Schema<ConditionDocument>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    is_enabled: { type: Boolean, required: true, default: true },
    chance: { type: Number, required: true, default: 0 },
    min_delta: { type: Number, required: true, default: 0 },
    max_delta: { type: Number, required: true, default: 0 },
    delta_mode: { type: String, enum: ['range', 'fixed_list'], required: true, default: 'range' },
    fixed_values: { type: [Number], default: [] },
    config: { type: Schema.Types.Mixed, default: {} },
    is_protected: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const ConditionModel = model<ConditionDocument>('Condition', conditionSchema);
