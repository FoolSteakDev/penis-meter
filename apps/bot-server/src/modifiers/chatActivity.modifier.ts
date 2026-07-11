import { getMessageCountLastHour } from '../services/chatActivity.service';
import { rollBaseDelta } from '../utils/deltaRoll.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

const DEFAULT_MESSAGE_THRESHOLD = 20;

export class ChatActivityModifier implements GrowthModifierHandler {
  code = 'chat_activity';

  async isEligible(context: GrowthModifierContext): Promise<boolean> {
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
