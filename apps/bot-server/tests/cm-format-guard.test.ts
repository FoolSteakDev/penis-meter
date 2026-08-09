import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

/** Файли, де КОЖЕН вивід "см" має йти через formatCm/formatCmSigned (фаза 3 плану). */
const FILES = [
  'src/bot/commands/duel.command.ts',
  'src/bot/commands/duel-history.command.ts',
  'src/bot/commands/global-rating.command.ts',
  'src/bot/commands/metr.command.ts',
  'src/bot/commands/rating.command.ts',
  'src/bot/commands/round.command.ts',
  'src/bot/commands/season.command.ts',
  'src/bot/commands/season-history.command.ts',
  'src/bot/commands/status.command.ts',
  'src/services/round-processor.service.ts',
];

/** rangeText (duel.command.ts) - вже зібраний через formatCm() рядком вище. */
const ALLOWED_PRE_FORMATTED_IDENTIFIERS = ['rangeText'];

const RAW_CM_INTERPOLATION = /\$\{([^}]+)\}\s*см/g;

describe('см formatting guard (phase 3.4)', () => {
  it('never interpolates a number before "см" without formatCm/formatCmSigned', () => {
    const offenders: string[] = [];

    for (const relativePath of FILES) {
      const content = readFileSync(path.join(ROOT, relativePath), 'utf8');
      for (const match of content.matchAll(RAW_CM_INTERPOLATION)) {
        const expr = match[1].trim();
        const isFormatted =
          expr.startsWith('formatCm(') ||
          expr.startsWith('formatCmSigned(') ||
          ALLOWED_PRE_FORMATTED_IDENTIFIERS.includes(expr);
        if (!isFormatted) {
          offenders.push(`${relativePath}: \${${expr}} см`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
