import { Schema, model, type HydratedDocument } from 'mongoose';

export interface SeasonTopEntry {
  telegram_id: number;
  username: string | null;
  first_name: string;
  growth: number;
  rank: number;
}

export interface SeasonChatTop {
  chat_id: number;
  top: SeasonTopEntry[];
}

export interface SeasonDocument {
  _id: Schema.Types.ObjectId;
  season_number: number;
  started_at: Date;
  ended_at: Date;
  top_global: SeasonTopEntry[];
  top_by_chat: SeasonChatTop[];
  created_at: Date;
  updated_at: Date;
}

export type SeasonHydratedDocument = HydratedDocument<SeasonDocument>;

const seasonTopEntrySchema = new Schema<SeasonTopEntry>(
  {
    telegram_id: { type: Number, required: true },
    username: { type: String, default: null },
    first_name: { type: String, required: true },
    growth: { type: Number, required: true },
    rank: { type: Number, required: true },
  },
  { _id: false },
);

const seasonChatTopSchema = new Schema<SeasonChatTop>(
  {
    chat_id: { type: Number, required: true },
    top: { type: [seasonTopEntrySchema], default: [] },
  },
  { _id: false },
);

const seasonSchema = new Schema<SeasonDocument>(
  {
    season_number: { type: Number, required: true, unique: true },
    started_at: { type: Date, required: true },
    ended_at: { type: Date, required: true },
    top_global: { type: [seasonTopEntrySchema], default: [] },
    top_by_chat: { type: [seasonChatTopSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const SeasonModel = model<SeasonDocument>('Season', seasonSchema);
