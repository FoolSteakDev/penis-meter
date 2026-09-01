import { UserModel } from '../database/models/user.model';
import { progress } from '../utils/mode.util';

export interface ChatStanding {
  /** 1 = найкращий прогрес у чаті. null — гравця немає серед активних учасників чату. */
  rank: number | null;
  size: number;
}

/** Ранг гравця в чаті за прогресом (як у /rating), рахується наживо — знімків рангу по днях не зберігаємо. */
export async function computeChatStanding(chatId: number, telegramId: number): Promise<ChatStanding> {
  const members = await UserModel.find({ chats: chatId });
  const sorted = [...members].sort((a, b) => progress(b.value, b.mode) - progress(a.value, a.mode));
  const size = sorted.length;
  const index = sorted.findIndex((u) => u.telegram_id === telegramId);
  return { rank: index === -1 ? null : index + 1, size };
}

/**
 * Наближення: історичних знімків value довільної давнини немає, тож "приріст
 * ІНШИХ гравців чату за вікно квесту" рахуємо як їхній round_growth (приріст за
 * поточний раунд) — beat_chat_average порівнює порядок величини, а не секунди,
 * тож розбіжність вікна (раунд vs. тривалість квесту) прийнятна.
 */
export async function computeChatAverageGrowth(chatId: number, excludeTelegramId: number): Promise<number> {
  const members = await UserModel.find({ chats: chatId, telegram_id: { $ne: excludeTelegramId } });
  if (members.length === 0) return 0;
  const total = members.reduce((sum, u) => sum + progress(u.round_growth, u.mode), 0);
  return total / members.length;
}
