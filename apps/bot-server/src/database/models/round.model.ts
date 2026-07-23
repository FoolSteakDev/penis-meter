import { Schema, model, type HydratedDocument } from 'mongoose';

export type RoundThemeSource = 'admin' | 'random_fallback' | 'legacy';

/**
 * Один документ на раунд - адмін-керований розклад тем (див.
 * services/round-lifecycle.service.ts::initializeRound). Документ з'являється
 * або коли адмін заздалегідь додає майбутній раунд (порожня тема), або коли
 * lifecycle-сервіс сам його upsert-нув на старт раунду без адмін-теми
 * (theme_source: 'random_fallback'), або через одноразовий бекфіл старих
 * раундів (theme_source: 'legacy').
 */
export interface RoundDocument {
  _id: Schema.Types.ObjectId;
  round_number: number;
  season_number: number;
  starts_at: Date;
  ends_at: Date;
  theme_name: string | null;
  theme_description: string | null;
  condition_code: string | null;
  condition_chance: number | null;
  theme_source: RoundThemeSource | null;
  created_at: Date;
  updated_at: Date;
}

export type RoundHydratedDocument = HydratedDocument<RoundDocument>;

const roundSchema = new Schema<RoundDocument>(
  {
    round_number: { type: Number, required: true, unique: true },
    season_number: { type: Number, required: true },
    starts_at: { type: Date, required: true },
    ends_at: { type: Date, required: true },
    theme_name: { type: String, default: null },
    theme_description: { type: String, default: null },
    condition_code: { type: String, default: null },
    condition_chance: { type: Number, default: null },
    theme_source: { type: String, enum: ['admin', 'random_fallback', 'legacy'], default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const RoundModel = model<RoundDocument>('Round', roundSchema);
