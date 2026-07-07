import { getMessageCountLastHour } from '../services/chatActivity.service';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

const DEFAULT_MESSAGE_THRESHOLD = 20;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class ChatActivityModifier implements GrowthModifierHandler {
  code = 'chat_activity';

  async isEligible(context: GrowthModifierContext): Promise<boolean> {
    const threshold = Number(context.condition.config.messageThreshold ?? DEFAULT_MESSAGE_THRESHOLD);
    return getMessageCountLastHour(context.chatId) >= threshold;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const delta = Math.round(randomInRange(minDelta, maxDelta) * 100) / 100;
    const count = getMessageCountLastHour(context.chatId);

    return {
      delta,
      message: `🔥 Чат активний (${count} повідомлень за останню годину) - колективна енергія працює на тебе!`,
    };
  }
}
