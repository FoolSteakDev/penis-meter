import type { Telegram } from 'telegraf';
import type { QuestAssignmentDocument } from '../database/models/quest-assignment.model';
import type { UserDocument } from '../database/models/user.model';
import { formatKyivDateTime } from '../utils/date.util';
import { formatCm } from '../utils/number.util';
import { userLabel } from '../utils/user-label.util';

/** «3 / 4» для reach-квестів; null для avoid/hold — там прогрес не числовий. */
function progressLabel(assignment: QuestAssignmentDocument): string | null {
  if (assignment.snapshot.kind !== 'reach') {
    return null;
  }
  const current = assignment.hit_keys.length > 0 ? assignment.hit_keys.length : assignment.progress;
  return `${current} / ${assignment.snapshot.target}`;
}

export function buildQuestStartText(user: UserDocument, assignment: QuestAssignmentDocument): string {
  const { snapshot } = assignment;
  return [
    `🧭 ${userLabel(user)} бере квест`,
    `${snapshot.emoji} ${snapshot.name} — ${snapshot.description}`,
    `⏳ до ${formatKyivDateTime(assignment.expires_at)} · нагорода +${formatCm(snapshot.reward_cm)} см · штраф −${formatCm(snapshot.penalty_cm)} см`,
  ].join('\n');
}

export function buildQuestCompletedText(user: UserDocument, assignment: QuestAssignmentDocument, appliedCm: number): string {
  const { snapshot } = assignment;
  return `✅ ${userLabel(user)} закриває квест ${snapshot.emoji} ${snapshot.name} → +${formatCm(Math.abs(appliedCm))} см`;
}

export function buildQuestFailedText(user: UserDocument, assignment: QuestAssignmentDocument, appliedCm: number): string {
  const { snapshot } = assignment;
  const lines = [`❌ ${userLabel(user)} провалює квест ${snapshot.emoji} ${snapshot.name} → −${formatCm(Math.abs(appliedCm))} см`];
  const progress = progressLabel(assignment);
  if (progress) {
    lines.push(`   Було ${progress}`);
  }
  return lines.join('\n');
}

export function buildQuestReminderText(user: UserDocument, assignment: QuestAssignmentDocument, minutesLeft: number): string {
  const { snapshot } = assignment;
  const progress = progressLabel(assignment);
  const suffix = progress ? ` — ${progress}` : '';
  return `⏳ ${userLabel(user)}, ${minutesLeft} хв до дедлайну: ${snapshot.emoji} ${snapshot.name}${suffix}`;
}

async function sendSafely(telegram: Telegram | null, chatId: number, text: string): Promise<number | null> {
  if (!telegram) {
    return null;
  }
  try {
    const message = await telegram.sendMessage(chatId, text);
    return message.message_id;
  } catch (error) {
    console.error(`[quests] failed to send message to chat ${chatId}`, error);
    return null;
  }
}

async function editSafely(telegram: Telegram | null, chatId: number, messageId: number, text: string): Promise<void> {
  if (!telegram) {
    return;
  }
  try {
    await telegram.editMessageText(chatId, messageId, undefined, text);
  } catch (error) {
    // Повідомлення могли видалити вручну - не помилка квестів.
    console.error(`[quests] failed to edit message ${messageId} in chat ${chatId}`, error);
  }
}

/** Викликається з екрана взяття квесту (quests.command.ts) - повертає message_id для chat_message_id. */
export async function announceQuestStart(
  telegram: Telegram | null,
  user: UserDocument,
  assignment: QuestAssignmentDocument,
): Promise<number | null> {
  return sendSafely(telegram, assignment.chat_id, buildQuestStartText(user, assignment));
}

/**
 * Редагує стартове повідомлення (якщо воно ще живе) І шле нове - інакше
 * провал загубиться в стрічці чату (див. 5.2 плану).
 */
export async function announceQuestResolution(
  telegram: Telegram | null,
  user: UserDocument,
  assignment: QuestAssignmentDocument,
  outcome: 'completed' | 'failed',
  appliedCm: number,
): Promise<void> {
  const text = outcome === 'completed'
    ? buildQuestCompletedText(user, assignment, appliedCm)
    : buildQuestFailedText(user, assignment, appliedCm);

  if (assignment.chat_message_id !== null) {
    await editSafely(telegram, assignment.chat_id, assignment.chat_message_id, text);
  }
  await sendSafely(telegram, assignment.chat_id, text);
}

export async function announceQuestReminder(
  telegram: Telegram | null,
  user: UserDocument,
  assignment: QuestAssignmentDocument,
  minutesLeft: number,
): Promise<void> {
  await sendSafely(telegram, assignment.chat_id, buildQuestReminderText(user, assignment, minutesLeft));
}
