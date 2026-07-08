import { Schema, model, type HydratedDocument } from 'mongoose';
import { getDefaultLastWeekendAnchor } from '../../utils/workSchedule.util';

export interface UserWork {
  schedule: number[];
  last_weekend: Date;
}

export interface UserDocument {
  _id: Schema.Types.ObjectId;
  telegram_id: number;
  username: string | null;
  first_name: string;
  value: number;
  last_measurement_at: Date | null;
  chats: number[];
  work: UserWork;
  created_at: Date;
  updated_at: Date;
}

export type UserHydratedDocument = HydratedDocument<UserDocument>;

const userWorkSchema = new Schema<UserWork>(
  {
    schedule: { type: [Number], default: () => [5, 2] },
    last_weekend: { type: Date, default: () => getDefaultLastWeekendAnchor() },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    telegram_id: { type: Number, required: true, unique: true },
    username: { type: String, default: null },
    first_name: { type: String, required: true },
    value: { type: Number, required: true },
    last_measurement_at: { type: Date, default: null },
    chats: { type: [Number], default: [] },
    work: { type: userWorkSchema, default: () => ({}) },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const UserModel = model<UserDocument>('User', userSchema);
