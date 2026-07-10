import { Schema, model, type HydratedDocument } from 'mongoose';
import { getDefaultLastWeekendAnchor } from '../../utils/workSchedule.util';

export interface UserWork {
  schedule: number[];
  last_weekend: Date;
}

export type UserTitleCode = 'champion' | 'silver' | 'bronze' | 'top10';
export type UserTitleScope = 'global' | 'chat';

export interface UserTitle {
  season_number: number;
  rank: number;
  title_code: UserTitleCode;
  scope: UserTitleScope;
  chat_id: number | null;
  awarded_at: Date;
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
  season_growth: number;
  round_growth: number;
  /** Найбільша одинична дельта в межах поточного раунду - для підсумку "найбільший стрибок". */
  round_best_delta: number | null;
  /** Кількість вимірів у поточному раунді - для квесту "N вимірів за тиждень". */
  round_measurement_count: number;
  titles: UserTitle[];
  /** Ранговий досвід - росте від активності (виміри, streak-бонус), не від value. */
  experience: number;
  /** Поточна серія "вчасних" вимірів підряд (без передчасних спроб і без запізнень). */
  streak_current: number;
  streak_best: number;
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

const userTitleSchema = new Schema<UserTitle>(
  {
    season_number: { type: Number, required: true },
    rank: { type: Number, required: true },
    title_code: { type: String, required: true },
    scope: { type: String, required: true },
    chat_id: { type: Number, default: null },
    awarded_at: { type: Date, required: true },
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
    season_growth: { type: Number, required: true, default: 0 },
    round_growth: { type: Number, required: true, default: 0 },
    round_best_delta: { type: Number, default: null },
    round_measurement_count: { type: Number, required: true, default: 0 },
    titles: { type: [userTitleSchema], default: [] },
    experience: { type: Number, required: true, default: 0 },
    streak_current: { type: Number, required: true, default: 0 },
    streak_best: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const UserModel = model<UserDocument>('User', userSchema);
