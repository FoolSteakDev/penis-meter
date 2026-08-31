import { RoundChatSnapshotModel } from '../database/models/round-chat-snapshot.model';
import type { UserHydratedDocument } from '../database/models/user.model';

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

export interface RoundStandings {
  /** chat_id -> telegram_id[] топ-3 на КІНЕЦЬ раунду */
  top3ByChat: Map<number, number[]>;
  /** ті, кого не було в знімку на старт раунду, а на кінець вони в топ-3 */
  climbers: { chatId: number; telegramId: number }[];
}

/**
 * Замінює колишні квестові нагороди (п.4 ТЗ): більше нічого не нагороджує
 * напряму - лише повідомляє, хто де фінішував. Нагороду за це тепер видає
 * система досягнень (holder/climber, див. achievements/achievement.registry.ts)
 * через лічильники, які накручує викликач цієї функції.
 */
export async function collectRoundStandings(
  users: UserHydratedDocument[],
  chatIds: number[],
  endedRoundNumber: number,
): Promise<RoundStandings> {
  const top3ByChat = new Map<number, number[]>();
  const climbers: { chatId: number; telegramId: number }[] = [];

  for (const chatId of chatIds) {
    const members = users.filter((u) => u.chats.includes(chatId));
    const currentTop3 = [...members].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3);
    top3ByChat.set(chatId, currentTop3.map((u) => u.telegram_id));

    // Знімка немає - чат просто пропускається для climbers (напр. процес довго простоював).
    const snapshot = await RoundChatSnapshotModel.findOne({ round_number: endedRoundNumber, chat_id: chatId });
    if (!snapshot) {
      continue;
    }

    for (const user of currentTop3) {
      if (!snapshot.top3_telegram_ids.includes(user.telegram_id)) {
        climbers.push({ chatId, telegramId: user.telegram_id });
      }
    }
  }

  return { top3ByChat, climbers };
}
