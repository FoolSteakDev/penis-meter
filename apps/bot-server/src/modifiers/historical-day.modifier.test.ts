import { describe, expect, it, vi } from 'vitest';
import { buildContext } from './test-helpers';
import { getTodayHistoricalEvent } from '../services/historical-day.service';
import { HistoricalDayModifier } from './historical-day.modifier';

vi.mock('../services/historical-day.service', () => ({
  getTodayHistoricalEvent: vi.fn(),
}));

describe('HistoricalDayModifier', () => {
  it('is eligible when there is a historical event today', async () => {
    vi.mocked(getTodayHistoricalEvent).mockReturnValue({ month: 1, day: 1, event: 'Test', text: 'Test text' });
    const modifier = new HistoricalDayModifier();
    expect(await modifier.isEligible(buildContext())).toBe(true);
  });

  it('is not eligible when there is no historical event today', async () => {
    vi.mocked(getTodayHistoricalEvent).mockReturnValue(null);
    const modifier = new HistoricalDayModifier();
    expect(await modifier.isEligible(buildContext())).toBe(false);
  });

  it('includes the event in the message when present', async () => {
    vi.mocked(getTodayHistoricalEvent).mockReturnValue({ month: 1, day: 1, event: 'Висадка на Місяць', text: 'Апофеоз людства' });
    const modifier = new HistoricalDayModifier();
    const { message } = await modifier.apply(buildContext());
    expect(message).toContain('Висадка на Місяць');
    expect(message).toContain('Апофеоз людства');
  });

  it('returns an empty message when there is no event (defensive branch)', async () => {
    vi.mocked(getTodayHistoricalEvent).mockReturnValue(null);
    const modifier = new HistoricalDayModifier();
    const { message } = await modifier.apply(buildContext());
    expect(message).toBe('');
  });
});
