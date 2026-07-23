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
  /**
   * Кеш адмін-керованої теми поточного раунду (round.model.ts), щоб
   * getActiveTheme() лишався синхронним і не бив зайвий раз у БД у гарячому
   * шляху (performMeasurement). Заповнені разом - або всі 4, або жодне;
   * порожні, коли активна легасі-тема (current_theme_code).
   */
  current_theme_name: string | null;
  current_theme_description: string | null;
  current_theme_condition_code: string | null;
  current_theme_condition_chance: number | null;
  /** Одноразове обнулення value/кулдауну на старт першого раунду сезону 1. */
  season_start_reset_done: boolean;
  created_at: Date;
  updated_at: Date;
}

export type GameStateHydratedDocument = HydratedDocument<GameStateDocument>;

const gameStateSchema = new Schema<GameStateDocument>(
  {
    last_processed_round_number: { type: Number, required: true, default: 0 },
    current_theme_code: { type: String, default: null },
    current_theme_round_number: { type: Number, required: true, default: 0 },
    current_theme_name: { type: String, default: null },
    current_theme_description: { type: String, default: null },
    current_theme_condition_code: { type: String, default: null },
    current_theme_condition_chance: { type: Number, default: null },
    season_start_reset_done: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const GameStateModel = model<GameStateDocument>('GameState', gameStateSchema);
