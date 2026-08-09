export interface MentionTarget {
  telegram_id: number;
  username: string | null;
  first_name: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @username - звичайний текстовий меншн, який Telegram резолвить сам і який
 * гарантовано пушить сповіщення будь-якому учаснику чату. tg://user?id= -
 * фолбек лише для тих, хто не має username; за докою Bot API він надійний
 * тільки для юзерів, які вже взаємодіяли з ботом.
 */
export function mentionHtml(user: MentionTarget): string {
  if (user.username) {
    return `@${user.username}`;
  }
  return `<a href="tg://user?id=${user.telegram_id}">${escapeHtml(user.first_name)}</a>`;
}

/** Чи буде цей меншн надійно пушити сповіщення (тобто чи є @username). */
export function hasReliableMention(user: MentionTarget): boolean {
  return Boolean(user.username);
}
