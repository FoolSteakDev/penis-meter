import { createApp } from './app';
import { createBot } from './bot/bot';
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
    console.error('[bot] launch failed', error);
    process.exit(1);
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((error) => {
  console.error('[fatal] failed to start application', error);
  process.exit(1);
});
