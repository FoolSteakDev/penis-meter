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
  const quest = await QuestModel.findOne({
    telegram_id: telegramId,
    round_number: roundNumber,
    type: 'duel_wins',
    is_completed: false,
  });
  if (!quest) {
    return null;
  }

  quest.progress += 1;
  if (quest.progress >= quest.target) {
    quest.is_completed = true;
    const reward = questTargets.find((t) => t.target === quest.target)?.reward_cm ?? 0;
    quest.reward_applied = reward > 0;
    await quest.save();
    return reward > 0 ? reward : null;
  }

  await quest.save();
  return null;
}
