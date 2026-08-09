import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // vitest 4's default exclude is just node_modules/.git - без цього
    // компільований dist/**/*.test.js (npm run build) теж підхоплюється
    // як тести й падає (CJS require() vitest).
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Усі тестові файли ділять один mongodb-memory-server (див. global-setup.ts),
    // а tests/setup.ts чистить колекції в afterEach - паралельні файли гасили б
    // дані одне в одного. Файл сюди дешевий (~60 тестів), послідовність важливіша.
    fileParallelism: false,
  },
});
