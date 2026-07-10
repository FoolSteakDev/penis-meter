import { Schema, model, type HydratedDocument } from 'mongoose';

/**
 * Знімок топ-3 чату за `value` на МОМЕНТ СТАРТУ раунду - потрібен, щоб
 * наприкінці раунду виявити "новачків" топ-3 (квест 4.2: увійти в топ-3,
 * не будучи там на старт тижня).
 */
export interface RoundChatSnapshotDocument {
  _id: Schema.Types.ObjectId;
  round_number: number;
  chat_id: number;
  top3_telegram_ids: number[];
  created_at: Date;
  updated_at: Date;
}

export type RoundChatSnapshotHydratedDocument = HydratedDocument<RoundChatSnapshotDocument>;

const roundChatSnapshotSchema = new Schema<RoundChatSnapshotDocument>(
  {
    round_number: { type: Number, required: true },
    chat_id: { type: Number, required: true },
    top3_telegram_ids: { type: [Number], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

roundChatSnapshotSchema.index({ round_number: 1, chat_id: 1 }, { unique: true });

export const RoundChatSnapshotModel = model<RoundChatSnapshotDocument>(
  'RoundChatSnapshot',
  roundChatSnapshotSchema,
);
