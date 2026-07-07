import { Schema, model, type HydratedDocument } from 'mongoose';

export interface UserDocument {
  _id: Schema.Types.ObjectId;
  telegram_id: number;
  username: string | null;
  first_name: string;
  value: number;
  last_measurement_at: Date | null;
  chats: number[];
  created_at: Date;
  updated_at: Date;
}

export type UserHydratedDocument = HydratedDocument<UserDocument>;

const userSchema = new Schema<UserDocument>(
  {
    telegram_id: { type: Number, required: true, unique: true },
    username: { type: String, default: null },
    first_name: { type: String, required: true },
    value: { type: Number, required: true },
    last_measurement_at: { type: Date, default: null },
    chats: { type: [Number], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const UserModel = model<UserDocument>('User', userSchema);
