import type { Context } from 'telegraf';
import { describe, expect, it } from 'vitest';
import { actorName, withActor } from './actor.util';

function fakeCtx(chatType: 'private' | 'group', firstName: string | null = 'Petro') {
  return {
    chat: { type: chatType },
    from: firstName === null ? undefined : { first_name: firstName },
  } as unknown as Context;
}

describe('actorName', () => {
  it('returns from.first_name', () => {
    expect(actorName(fakeCtx('group', 'Petro'))).toBe('Petro');
  });

  it('returns null when ctx.from is missing', () => {
    expect(actorName(fakeCtx('group', null))).toBeNull();
  });
});

describe('withActor', () => {
  it('returns the text unchanged in a private chat', () => {
    expect(withActor(fakeCtx('private'), 'hello')).toBe('hello');
  });

  it('prepends "👤 Name" as the first line in a group chat', () => {
    expect(withActor(fakeCtx('group'), 'hello')).toBe('👤 Petro\nhello');
  });

  it('escapes the name when parse_mode is HTML', () => {
    const ctx = fakeCtx('group', '<Petro> & Co');
    expect(withActor(ctx, 'hello', { parse_mode: 'HTML' })).toBe('👤 &lt;Petro&gt; &amp; Co\nhello');
  });

  it('does not escape the name without parse_mode', () => {
    const ctx = fakeCtx('group', '<Petro> & Co');
    expect(withActor(ctx, 'hello')).toBe('👤 <Petro> & Co\nhello');
  });

  it('never produces a leading @mention or tg://user link (no-notification guard)', () => {
    const ctx = fakeCtx('group', 'Petro');
    const result = withActor(ctx, 'hello');
    expect(result).not.toMatch(/^@/m);
    expect(result).not.toContain('tg://user');
  });
});
