import { describe, expect, it } from 'vitest';
import { QUEST_RULES } from './quest.rules';
import { QUEST_SEED } from './quest-seed.data';

describe('QUEST_RULES', () => {
  it('has a callback set consistent with its kind', () => {
    for (const rule of QUEST_RULES) {
      if (rule.kind === 'avoid') {
        expect(rule.violates, `${rule.code}: avoid needs violates`).toBeTypeOf('function');
      }
      if (rule.kind === 'reach') {
        expect(
          rule.contribution ?? rule.distinctKey,
          `${rule.code}: reach needs contribution or distinctKey`,
        ).toBeTypeOf('function');
      }
      if (rule.kind === 'hold') {
        expect(rule.evaluate, `${rule.code}: hold needs evaluate`).toBeTypeOf('function');
      }
    }
  });

  it('describes every param with a key, label and type', () => {
    for (const rule of QUEST_RULES) {
      for (const param of rule.params) {
        expect(param.key.length, `${rule.code}: param key`).toBeGreaterThan(0);
        expect(param.label.length, `${rule.code}: param label`).toBeGreaterThan(0);
        expect(['number', 'string_list']).toContain(param.type);
      }
    }
  });

  it('has no duplicate codes', () => {
    const codes = QUEST_RULES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every rule referenced by the starter seed exists in the registry', () => {
    const registryCodes = new Set(QUEST_RULES.map((r) => r.code));
    for (const quest of QUEST_SEED) {
      expect(registryCodes.has(quest.rule), `seed quest ${quest.code} uses unknown rule ${quest.rule}`).toBe(true);
    }
  });

  it('every rule in the registry is used by at least one starter quest', () => {
    const seedRuleCodes = new Set(QUEST_SEED.map((q) => q.rule));
    for (const rule of QUEST_RULES) {
      expect(seedRuleCodes.has(rule.code), `rule ${rule.code} is not used by any starter quest`).toBe(true);
    }
  });
});
