const ONE_HOUR_MS = 60 * 60 * 1000;

// В памʼяті процесу - достатньо для одного Node-процесу (див. п.11 ТЗ),
// скидається при рестарті, що прийнятно для жартівливого бонусу.
const messageTimestampsByChat = new Map<number, number[]>();

function pruneOldTimestamps(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t <= ONE_HOUR_MS);
}

export function recordChatMessage(chatId: number): void {
  const now = Date.now();
  const timestamps = pruneOldTimestamps(messageTimestampsByChat.get(chatId) ?? [], now);
  timestamps.push(now);
  messageTimestampsByChat.set(chatId, timestamps);
}

export function getMessageCountLastHour(chatId: number): number {
  const now = Date.now();
  const timestamps = pruneOldTimestamps(messageTimestampsByChat.get(chatId) ?? [], now);
  messageTimestampsByChat.set(chatId, timestamps);
  return timestamps.length;
}
