import { getMessageCountLastHour } from '../services/chat-activity.service';
import { rollBaseDelta } from '../utils/delta-roll.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growth-modifier.types';

const DEFAULT_MESSAGE_THRESHOLD = 20;

export class ChatActivityModifier implements GrowthModifierHandler {
  code = 'chat_activity';

  async isEligible(context: GrowthModifierContext): Promise<boolean> {
    // Поріг практично недосяжний у групах, де в @BotFather не вимкнено privacy
    // mode (/setprivacy -> Disable) - бот тоді бачить лише команди й реплаї на
    // себе, а не всі повідомлення чату. Див. README, розділ "Налаштування в
    // @BotFather". Гарячий шлях - тому нічого не логуємо тут.
    const threshold = Number(context.condition.config.messageThreshold ?? DEFAULT_MESSAGE_THRESHOLD);
    return getMessageCountLastHour(context.chatId) >= threshold;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const delta = rollBaseDelta(context.condition);
    const count = getMessageCountLastHour(context.chatId);

    return {
      delta,
      message: `🔥 Чат активний (${count} повідомлень за останню годину) - колективна енергія працює на тебе!`,
    };
  }
}
