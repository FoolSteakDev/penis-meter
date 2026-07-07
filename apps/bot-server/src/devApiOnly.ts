import { createApp } from './app';
import { envConfig } from './config/env.config';
import { connectMongo } from './database/mongo.connection';

async function main(): Promise<void> {
  await connectMongo();
  const app = createApp();
  app.listen(envConfig.port, () => {
    console.log(`[server] (API-only, no bot polling) listening on port ${envConfig.port}`);
  });
}

main().catch((error) => {
  console.error('[fatal] failed to start application', error);
  process.exit(1);
});
