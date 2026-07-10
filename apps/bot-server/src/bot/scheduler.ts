import cron from 'node-cron';
import type { Telegraf } from 'telegraf';
import { processRoundTransitions } from '../services/roundProcessor.service';

const CRON_EXPRESSION = '*/15 * * * *';

async function runRoundTransitions(bot: Telegraf): Promise<void> {
  try {
    await processRoundTransitions(bot);
  } catch (error) {
    console.error('[scheduler] processRoundTransitions failed', error);
  }
}

/**
 * Раз на 15 хв перевіряє, чи не настав кінець раунду/сезону, і якщо так -
 * надсилає підсумки в чати та скидає лічильники (див. roundProcessor.service.ts).
 * Раунди/сезони мають гранулярність у днях, тож 15 хв - з великим запасом.
 */
export function startRoundScheduler(bot: Telegraf): void {
  // одразу при старті процесу - щоб не чекати до 15 хв на "наздоганяючий" тик
  void runRoundTransitions(bot);

  cron.schedule(CRON_EXPRESSION, () => runRoundTransitions(bot), { noOverlap: true });
  console.log(`[scheduler] round/season cron scheduled (${CRON_EXPRESSION})`);
}
