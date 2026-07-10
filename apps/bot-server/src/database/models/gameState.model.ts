import { Schema, model, type HydratedDocument } from 'mongoose';

/**
 * Singleton-документ (завжди один) - глобальний стан системи раундів/сезонів.
 * `last_processed_round_number` - останній раунд, для якого вже надіслано
 * підсумок і скинуто лічильники (0 = ще жодного). `current_theme_*` -
 * тема, що діє для раунду `current_theme_round_number`.
 */
export interface GameStateDocument {
  _id: Schema.Types.ObjectId;
  last_processed_round_number: number;
  current_theme_code: string | null;
  current_theme_round_number: number;
  created_at: Date;
  updated_at: Date;
}

export type GameStateHydratedDocument = HydratedDocument<GameStateDocument>;

const gameStateSchema = new Schema<GameStateDocument>(
  {
    last_processed_round_number: { type: Number, required: true, default: 0 },
    current_theme_code: { type: String, default: null },
    current_theme_round_number: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const GameStateModel = model<GameStateDocument>('GameState', gameStateSchema);
