import type { Telegram } from 'telegraf';

/**
 * Видаляє повідомлення пачкою, ігноруючи помилки: бот може не мати
 * can_delete_messages, повідомлення могло бути видалене вручну, або йому >48 год.
 * Логуємо один раз на пачку, не на кожен id, щоб не спамити.
 */
export async function safeDeleteMessages(
  telegram: Telegram,
  chatId: number,
  messageIds: Array<number | null | undefined>,
): Promise<void> {
  const ids = messageIds.filter((id): id is number => typeof id === 'number');
  if (ids.length === 0) {
    return;
  }
  try {
    await telegram.deleteMessages(chatId, ids);
  } catch (error) {
    console.error(`[duel] failed to delete service messages in chat ${chatId}`, error);
  }
}
