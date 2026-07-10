import { UserModel, type UserHydratedDocument } from '../database/models/user.model';
import { registerDuelWin } from '../services/quest.service';
import { getCurrentRoundNumber } from '../utils/seasonRound.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function findOpponents(chatId: number, telegramId: number) {
  return UserModel.find({ chats: chatId, telegram_id: { $ne: telegramId } });
}

/**
 * Дуель зачіпає опонента напряму (не через його власний /metr), тому
 * round_growth/season_growth/round_best_delta потрібно оновити тут вручну -
 * інакше підсумки раунду/сезону не побачать цього приросту чи втрати.
 */
async function applyOpponentDelta(opponent: UserHydratedDocument, delta: number): Promise<void> {
  opponent.value = Math.round((opponent.value + delta) * 100) / 100;
  opponent.round_growth = Math.round((opponent.round_growth + delta) * 100) / 100;
  opponent.season_growth = Math.round((opponent.season_growth + delta) * 100) / 100;
  if (opponent.round_best_delta === null || delta > opponent.round_best_delta) {
    opponent.round_best_delta = delta;
  }
  await opponent.save();
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
    const opponentLabel = opponent.username ?? opponent.first_name;
    const invokerWins = Math.random() < 0.5;

    if (invokerWins) {
      await applyOpponentDelta(opponent, -amount);

      const roundNumber = getCurrentRoundNumber();
      const questReward = await registerDuelWin(context.user.telegramId, roundNumber);
      const questNote = questReward ? `\n🎯 Квест виконано! Бонус: +${questReward} см` : '';

      // Нагорода квесту йде через ту саму `delta`, що й performMeasurement
      // збереже одним викликом - окремий запис у БД тут створив би гонку
      // (див. коментар у quest.service.ts::registerDuelWin).
      return {
        delta: questReward ? amount + questReward : amount,
        message: `⚔️ Зустрів ${opponentLabel}! Ти переміг і забрав ${amount} см собі!${questNote}`,
      };
    }

    await applyOpponentDelta(opponent, amount);
    return {
      delta: -amount,
      message: `⚔️ Зустрів ${opponentLabel}! Ти програв і віддав ${amount} см!`,
    };
  }
}
