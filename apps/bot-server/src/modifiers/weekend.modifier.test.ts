import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildContext, FAKE_USER } from './test-helpers';
import { WeekendModifier } from './weekend.modifier';

dayjs.extend(utc);

const NOW = dayjs.utc('2026-07-13T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW.toDate());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WeekendModifier', () => {
  it('is eligible on a rest day per the user schedule', async () => {
    const modifier = new WeekendModifier();
    const user = { ...FAKE_USER, work: { schedule: [5, 2], lastWeekend: NOW.toDate() } };
    expect(await modifier.isEligible(buildContext({}, user))).toBe(true);
  });

  it('is not eligible on a work day per the user schedule', async () => {
    const modifier = new WeekendModifier();
    vi.setSystemTime(NOW.add(2, 'day').toDate());
    const user = { ...FAKE_USER, work: { schedule: [5, 2], lastWeekend: NOW.toDate() } };
    expect(await modifier.isEligible(buildContext({}, user))).toBe(false);
  });

  it('rolls a delta within [minDelta, maxDelta]', async () => {
    const modifier = new WeekendModifier();
    const { delta } = await modifier.apply(buildContext({ minDelta: -2, maxDelta: 2 }));
    expect(delta).toBeGreaterThanOrEqual(-2);
    expect(delta).toBeLessThanOrEqual(2);
  });
});
