import {
  DUEL_QUEST_CHANCE_BOOST,
  DUEL_QUEST_REWARD_CM,
  DUEL_QUEST_TARGETS,
  INDIVIDUAL_QUEST_CHANCE,
} from '../config/constants';
import { QuestModel, type QuestHydratedDocument } from '../database/models/quest.model';
import type { UserHydratedDocument } from '../database/models/user.model';

function pickRandomDuelTarget(): number {
  return DUEL_QUEST_TARGETS[Math.floor(Math.random() * DUEL_QUEST_TARGETS.length)];
}

/**
 * На старт раунду - для кожного активного юзера є шанс INDIVIDUAL_QUEST_CHANCE
 * отримати квест "виграй N дуелей" (не всім одразу, див. відповідь на п.5).
 */
export async function assignDuelQuestsForRound(roundNumber: number, users: UserHydratedDocument[]): Promise<void> {
  for (const user of users) {
    if (Math.random() >= INDIVIDUAL_QUEST_CHANCE) {
      continue;
    }
    const target = pickRandomDuelTarget();
    await QuestModel.create({
      telegram_id: user.telegram_id,
      round_number: roundNumber,
      type: 'duel_wins',
      target,
      progress: 0,
      is_completed: false,
      reward_applied: false,
      config: { chanceBoost: DUEL_QUEST_CHANCE_BOOST },
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

/** Персональний оверрайд шансу умови "дуель" для юзера, якщо в нього є активний квест. */
export async function getDuelChanceOverrideForUser(telegramId: number, roundNumber: number): Promise<number | null> {
  const quest = await getActiveDuelQuest(telegramId, roundNumber);
  if (!quest) {
    return null;
  }
  const boost = quest.config.chanceBoost;
  return typeof boost === 'number' ? boost : DUEL_QUEST_CHANCE_BOOST;
}

/**
 * Викликається після перемоги в дуелі. Повертає нагороду (см), якщо квест
 * щойно виконано цим виміром, інакше null.
 *
 * ВАЖЛИВО: сама нагорода НЕ пишеться в БД тут - викликач (duel.modifier.ts)
 * має додати її до своєї `delta`, щоб вона пройшла через єдиний
 * performMeasurement.save() разом з рештою приросту. Окремий `$inc` тут
 * створював гонку: performMeasurement пізніше перезаписував user.value зі
 * застарілого значення в пам'яті, тихо стираючи щойно застосовану нагороду.
 */
export async function registerDuelWin(telegramId: number, roundNumber: number): Promise<number | null> {
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
    const reward = DUEL_QUEST_REWARD_CM[quest.target] ?? 0;
    quest.reward_applied = reward > 0;
    await quest.save();
    return reward > 0 ? reward : null;
  }

  await quest.save();
  return null;
}
