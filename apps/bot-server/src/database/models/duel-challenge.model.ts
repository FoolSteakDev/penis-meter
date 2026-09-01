import { Schema, model, type HydratedDocument } from 'mongoose';

export type DuelChallengeStatus = 'draft' | 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

/**
 * Виклик на дуель. Життєвий цикл: 'draft' (крок 1 - обрано опонента, ставка
 * ще не обрана) -> 'pending' (крок 2 завершено, чекає відповіді опонента) ->
 * 'accepted' | 'declined' | 'expired'. Не плутати з duel-history.model.ts -
 * це лише сам виклик, історія пише вже РЕЗУЛЬТАТ прийнятої дуелі.
 *
 * `expires_at` НЕ має TTL-індексу - документ не видаляється автоматично щойно
 * протермінувався, інакше resolveChallenge() ніколи не бачить статус
 * 'expired', а живі кнопки "Прийняти/Відхилити" в чаті лишаються назавжди
 * (sweeper, round-processor.service.ts-подібний cron, сам виставляє
 * 'expired' і редагує повідомлення). Видалення документа - через `cleanup_at`
 * нижче, з запасом у часі, щоб історія викликів пожила для дебагу.
 */
export interface DuelChallengeDocument {
  _id: Schema.Types.ObjectId;
  chat_id: number;
  challenger_telegram_id: number;
  target_telegram_id: number;
  status: DuelChallengeStatus;
  /** Ставка в см. null, поки виклик ще 'draft' (крок 2 не пройдено). */
  stake: number | null;
  /** Чат, куди відправлено повідомлення з викликом (крок 2 -> 'pending'). */
  invite_chat_id: number | null;
  /** id повідомлення з викликом - щоб sweeper міг відредагувати його при протермінуванні. */
  invite_message_id: number | null;
  /** id ForceReply-підказки "введи ставку" - щоб зіставити текстову відповідь із чернеткою. */
  stake_prompt_message_id: number | null;
  /** id повідомлення кроку 1→2 (вибір опонента / вибір ставки) - щоб прибрати його після старту виклику. */
  flow_message_id: number | null;
  /** Скільки см фактично зіграло в цій дуелі (після перевалідації меж у resolveChallenge). База ставки реваншу. null, поки не 'accepted'. */
  resolved_stake: number | null;
  /** Id завершеного виклику, з кнопки якого стартував цей. null для звичайних викликів з /duel. */
  rematch_of: Schema.Types.ObjectId | null;
  expires_at: Date;
  /** Коли документ фізично видаляється (TTL-індекс) - expires_at + запас на дебаг. */
  cleanup_at: Date;
  created_at: Date;
  updated_at: Date;
}

export type DuelChallengeHydratedDocument = HydratedDocument<DuelChallengeDocument>;

const duelChallengeSchema = new Schema<DuelChallengeDocument>(
  {
    chat_id: { type: Number, required: true },
    challenger_telegram_id: { type: Number, required: true },
    target_telegram_id: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'accepted', 'declined', 'expired', 'cancelled'],
      required: true,
      default: 'pending',
    },
    stake: { type: Number, default: null },
    invite_chat_id: { type: Number, default: null },
    invite_message_id: { type: Number, default: null },
    stake_prompt_message_id: { type: Number, default: null },
    flow_message_id: { type: Number, default: null },
    resolved_stake: { type: Number, default: null },
    rematch_of: { type: Schema.Types.ObjectId, ref: 'DuelChallenge', default: null },
    expires_at: { type: Date, required: true },
    cleanup_at: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

duelChallengeSchema.index({ challenger_telegram_id: 1, status: 1 });
duelChallengeSchema.index({ challenger_telegram_id: 1, target_telegram_id: 1, status: 1 });
duelChallengeSchema.index({ status: 1, expires_at: 1 });
duelChallengeSchema.index({ stake_prompt_message_id: 1 }, { sparse: true });
duelChallengeSchema.index({ cleanup_at: 1 }, { expireAfterSeconds: 0 });
duelChallengeSchema.index(
  { rematch_of: 1 },
  { unique: true, partialFilterExpression: { rematch_of: { $type: 'objectId' }, status: 'pending' } },
);

export const DuelChallengeModel = model<DuelChallengeDocument>('DuelChallenge', duelChallengeSchema);
