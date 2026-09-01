import cron from 'node-cron';
import type { Telegraf } from 'telegraf';
import { processRoundTransitions } from '../services/round-processor.service';
import { sweepExpiredChallenges } from '../services/duel.service';
import { sweepQuests } from '../quests/quest-sweeper';

const ROUND_CRON_EXPRESSION = '*/15 * * * *';
const DUEL_SWEEP_CRON_EXPRESSION = '*/5 * * * *';
// Щохвилини, а не раз на 5 хв, як дуелі: таймери квестів бувають на 6 годин,
// і хвилина похибки на дедлайні вже помітна, коли на кону штраф.
const QUEST_SWEEP_CRON_EXPRESSION = '* * * * *';

async function runRoundTransitions(bot: Telegraf): Promise<void> {
  try {
    await processRoundTransitions(bot);
  } catch (error) {
    console.error('[scheduler] processRoundTransitions failed', error);
  }
}

async function runDuelSweep(bot: Telegraf): Promise<void> {
  try {
    await sweepExpiredChallenges(bot);
  } catch (error) {
    console.error('[scheduler] sweepExpiredChallenges failed', error);
  }
}

async function runQuestSweep(bot: Telegraf): Promise<void> {
  try {
    await sweepQuests(bot);
  } catch (error) {
    console.error('[scheduler] sweepQuests failed', error);
  }
}

/**
 * Раз на 15 хв перевіряє, чи не настав кінець раунду/сезону, і якщо так -
 * надсилає підсумки в чати та скидає лічильники (див. round-processor.service.ts).
 * Раунди/сезони мають гранулярність у днях, тож 15 хв - з великим запасом.
 *
 * Раз на 5 хв прибирає протерміновані виклики на дуель і чернетки, що
 * зависли на виборі ставки (див. duel.service.ts::sweepExpiredChallenges) -
 * частіше за раунди, бо виклики живуть годинами, а не днями.
 */
export function startSchedulers(bot: Telegraf): void {
  // одразу при старті процесу - щоб не чекати до тіку на "наздоганяючий" прохід
  void runRoundTransitions(bot);
  void runDuelSweep(bot);
  void runQuestSweep(bot);

  cron.schedule(ROUND_CRON_EXPRESSION, () => runRoundTransitions(bot), { noOverlap: true });
  console.log(`[scheduler] round/season cron scheduled (${ROUND_CRON_EXPRESSION})`);

  cron.schedule(DUEL_SWEEP_CRON_EXPRESSION, () => runDuelSweep(bot), { noOverlap: true });
  console.log(`[scheduler] duel sweep cron scheduled (${DUEL_SWEEP_CRON_EXPRESSION})`);

  cron.schedule(QUEST_SWEEP_CRON_EXPRESSION, () => runQuestSweep(bot), { noOverlap: true });
  console.log(`[scheduler] quest sweep cron scheduled (${QUEST_SWEEP_CRON_EXPRESSION})`);
}
