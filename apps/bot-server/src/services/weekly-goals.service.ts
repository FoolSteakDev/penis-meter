import { CLIMBER_QUEST_REWARD_CM, MEASUREMENT_COUNT_QUEST_TIERS } from '../config/constants';
import { RoundChatSnapshotModel } from '../database/models/round-chat-snapshot.model';
import { UserModel, type UserHydratedDocument } from '../database/models/user.model';
import { modeSign } from '../utils/mode.util';
import { userLabel } from '../utils/user-label.util';
import { buildClampedValueUpdate } from '../utils/value-update.util';

export interface MeasurementCountAward {
  telegramId: number;
  label: string;
  threshold: number;
  rewardCm: number;
}

/**
 * Квест "N вимірів за тиждень" (однаковий для всіх, п.4.1) - нагороджує
 * найвищий досягнутий поріг, викликається наприкінці раунду.
 */
export async function processMeasurementCountQuests(users: UserHydratedDocument[]): Promise<MeasurementCountAward[]> {
  const awards: MeasurementCountAward[] = [];

  for (const user of users) {
    let best: [number, number] | null = null;
    for (const [threshold, reward] of MEASUREMENT_COUNT_QUEST_TIERS) {
      if (user.round_measurement_count >= threshold) {
        best = [threshold, reward];
      }
    }
    if (!best) {
      continue;
    }

    const [threshold, rewardCm] = best;
    // Нагорода - завжди прогрес у бік мети гравця, не сирі см: буровику
    // "N вимірів" мала б віддаляти його від мети без modeSign (4.2.3).
    await UserModel.updateOne(
      { telegram_id: user.telegram_id },
      buildClampedValueUpdate(rewardCm * modeSign(user.mode), user.mode),
    );
    awards.push({ telegramId: user.telegram_id, label: userLabel(user), threshold, rewardCm });
  }

  return awards;
}

/** Знімок топ-3 (за value) кожного активного чату - береться на СТАРТ раунду. */
export async function takeTop3Snapshots(
  roundNumber: number,
  users: UserHydratedDocument[],
  chatIds: number[],
): Promise<void> {
  for (const chatId of chatIds) {
    const members = users.filter((u) => u.chats.includes(chatId));
    const top3 = [...members]
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 3)
      .map((u) => u.telegram_id);

    await RoundChatSnapshotModel.updateOne(
      { round_number: roundNumber, chat_id: chatId },
      { round_number: roundNumber, chat_id: chatId, top3_telegram_ids: top3 },
      { upsert: true },
    );
  }
}

export interface ClimberAward {
  chatId: number;
  telegramId: number;
  label: string;
  rewardCm: number;
}

/**
 * Квест "увійти в топ-3 чату (за value), не будучи там на старт раунду"
 * (п.4.2) - порівнює поточний топ-3 зі знімком, узятим на старт раунду.
 * Якщо знімка немає (напр. процес довго простоював) - чат просто
 * пропускається, без падіння.
 */
export async function processClimberQuests(
  users: UserHydratedDocument[],
  chatIds: number[],
  endedRoundNumber: number,
): Promise<ClimberAward[]> {
  const awards: ClimberAward[] = [];

  for (const chatId of chatIds) {
    const snapshot = await RoundChatSnapshotModel.findOne({ round_number: endedRoundNumber, chat_id: chatId });
    if (!snapshot) {
      continue;
    }

    const members = users.filter((u) => u.chats.includes(chatId));
    const currentTop3 = [...members].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3);

    for (const user of currentTop3) {
      if (!snapshot.top3_telegram_ids.includes(user.telegram_id)) {
        await UserModel.updateOne(
          { telegram_id: user.telegram_id },
          buildClampedValueUpdate(CLIMBER_QUEST_REWARD_CM * modeSign(user.mode), user.mode),
        );
        awards.push({ chatId, telegramId: user.telegram_id, label: userLabel(user), rewardCm: CLIMBER_QUEST_REWARD_CM });
      }
    }
  }

  return awards;
}
