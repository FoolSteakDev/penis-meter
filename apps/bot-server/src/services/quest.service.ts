import { INDIVIDUAL_QUEST_CHANCE } from '../config/constants';
import type { DuelQuestTarget } from '../database/models/duel-settings.model';
import { QuestModel, type QuestHydratedDocument } from '../database/models/quest.model';
import type { UserHydratedDocument } from '../database/models/user.model';

function pickRandomDuelTarget(questTargets: DuelQuestTarget[]): number {
  return questTargets[Math.floor(Math.random() * questTargets.length)].target;
}

/**
 * На старт раунду - для кожного активного юзера є шанс INDIVIDUAL_QUEST_CHANCE
 * отримати квест "виграй N дуелей" (не всім одразу, див. відповідь на п.5).
 * `questTargets` - адмін-налаштовані стріки (ціль перемог + нагорода), див.
 * duel-settings.model.ts.
 */
export async function assignDuelQuestsForRound(
  roundNumber: number,
  users: UserHydratedDocument[],
  questTargets: DuelQuestTarget[],
): Promise<void> {
  if (questTargets.length === 0) {
    return;
  }
  for (const user of users) {
    if (Math.random() >= INDIVIDUAL_QUEST_CHANCE) {
      continue;
    }
    const target = pickRandomDuelTarget(questTargets);
    await QuestModel.create({
      telegram_id: user.telegram_id,
      round_number: roundNumber,
      type: 'duel_wins',
      target,
      progress: 0,
      is_completed: false,
      reward_applied: false,
    });
  }
}

export async function getActiveDuelQuest(telegramId: number, roundNumber: number): Promise<QuestHydratedDocument | null> {
  return QuestModel.findOne({
    telegram_id: telegramId,
    round_number: roundNumber,
    type: 'duel_wins',
    is_completed: false,
  });
}

/** Як getActiveDuelQuest, але без фільтра is_completed - для /round, щоб гравець бачив підтвердження щойно виконаного квесту, а не його зникнення. */
export async function getDuelQuestForRound(telegramId: number, roundNumber: number): Promise<QuestHydratedDocument | null> {
  return QuestModel.findOne({
    telegram_id: telegramId,
    round_number: roundNumber,
    type: 'duel_wins',
  });
}

/**
 * Викликається після перемоги в дуелі. Повертає нагороду (см), якщо квест
 * щойно виконано цим виміром, інакше null.
 *
 * ВАЖЛИВО: сама нагорода НЕ пишеться в БД тут - викликач (duel.service.ts)
 * має сам застосувати її до `value`/`round_growth`/`season_growth` переможця
 * в тій самій транзакції, що й дельту дуелі, щоб уникнути гонки з паралельним
 * оновленням користувача.
 */
export async function registerDuelWin(
  telegramId: number,
  roundNumber: number,
  questTargets: DuelQuestTarget[],
): Promise<number | null> {
  // Атомарний $inc замість read-modify-save - два паралельні виграші того
  // самого юзера не мають загубити один одного. Завершення квесту - окремий
  // атомарний апдейт із фільтром is_completed: false, щоб при паралельному
  // перегоні прогресу через ціль нагорода видалась рівно раз.
  const incremented = await QuestModel.findOneAndUpdate(
    { telegram_id: telegramId, round_number: roundNumber, type: 'duel_wins', is_completed: false },
    { $inc: { progress: 1 } },
    { new: true },
  );
  if (!incremented || incremented.progress < incremented.target) {
    return null;
  }

  const reward = questTargets.find((t) => t.target === incremented.target)?.reward_cm ?? 0;
  const completed = await QuestModel.findOneAndUpdate(
    { _id: incremented._id, is_completed: false },
    { $set: { is_completed: true, reward_applied: reward > 0 } },
  );
  if (!completed) {
    return null;
  }

  return reward > 0 ? reward : null;
}
