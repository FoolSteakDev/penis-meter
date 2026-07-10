import { createApp } from './app';
import { createBot } from './bot/bot';
import { startRoundScheduler } from './bot/scheduler';
import { envConfig } from './config/env.config';
import { connectMongo } from './database/mongo.connection';

async function main(): Promise<void> {
  await connectMongo();

  const app = createApp();
  app.listen(envConfig.port, () => {
    console.log(`[server] listening on port ${envConfig.port}`);
  });

  const bot = createBot();

  // bot.launch() резолвиться лише після bot.stop() (внутрішній цикл
  // long-polling блокує проміс), тому його не можна await'ити тут - інакше
  // код нижче (лог, реєстрація сигналів) ніколи не виконається.
  bot.launch(() => {
    console.log('[bot] started (long polling)');
  }).catch((error) => {
    // Не завершуємо процес - інакше збій бота (напр. 409 Conflict через
    // паралельний запуск, тимчасова мережева проблема) кладе і Express
    // (адмін API, /health), а він має жити незалежно від стану бота.
    console.error('[bot] launch failed - Express/API продовжують працювати', error);
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  startRoundScheduler(bot);
}

main().catch((error) => {
  console.error('[fatal] failed to start application', error);
  process.exit(1);
});
