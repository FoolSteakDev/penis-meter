import { UserModel } from '../database/models/user.model';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function findOpponents(chatId: number, telegramId: number) {
  return UserModel.find({ chats: chatId, telegram_id: { $ne: telegramId } });
}

export class DuelModifier implements GrowthModifierHandler {
  code = 'duel';

  async isEligible(context: GrowthModifierContext): Promise<boolean> {
    const opponentsCount = await UserModel.countDocuments({
      chats: context.chatId,
      telegram_id: { $ne: context.user.telegramId },
    });
    return opponentsCount > 0;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const opponents = await findOpponents(context.chatId, context.user.telegramId);

    if (opponents.length === 0) {
      // теоретично неможливо, якщо isEligible відпрацював коректно, але про всяк випадок
      return { delta: 0, message: '' };
    }

    const opponent = opponents[Math.floor(Math.random() * opponents.length)];
    const amount = Math.round(randomInRange(Math.abs(minDelta), Math.abs(maxDelta)) * 100) / 100;
    const opponentLabel = opponent.username ? `@${opponent.username}` : opponent.first_name;
    const invokerWins = Math.random() < 0.5;

    if (invokerWins) {
      await UserModel.updateOne({ _id: opponent._id }, { $inc: { value: -amount } });
      return {
        delta: amount,
        message: `⚔️ Дуель з ${opponentLabel}! Ти переміг і забрав ${amount} см собі!`,
      };
    }

    await UserModel.updateOne({ _id: opponent._id }, { $inc: { value: amount } });
    return {
      delta: -amount,
      message: `⚔️ Дуель з ${opponentLabel}! Ти програв і віддав ${amount} см!`,
    };
  }
}
