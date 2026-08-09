import { describe, expect, it, vi } from 'vitest';
import { buildContext } from './test-helpers';
import { getMessageCountLastHour } from '../services/chat-activity.service';
import { ChatActivityModifier } from './chat-activity.modifier';

vi.mock('../services/chat-activity.service', () => ({
  getMessageCountLastHour: vi.fn(),
}));

describe('ChatActivityModifier', () => {
  it('is eligible when the message count meets the configured threshold', async () => {
    vi.mocked(getMessageCountLastHour).mockReturnValue(15);
    const modifier = new ChatActivityModifier();
    expect(await modifier.isEligible(buildContext({ config: { messageThreshold: 10 } }))).toBe(true);
  });

  it('is not eligible when the message count is below the threshold', async () => {
    vi.mocked(getMessageCountLastHour).mockReturnValue(5);
    const modifier = new ChatActivityModifier();
    expect(await modifier.isEligible(buildContext({ config: { messageThreshold: 10 } }))).toBe(false);
  });

  it('falls back to the default threshold when config is missing it', async () => {
    vi.mocked(getMessageCountLastHour).mockReturnValue(15);
    const modifier = new ChatActivityModifier();
    expect(await modifier.isEligible(buildContext({ config: {} }))).toBe(false);
  });

  it('rolls a delta within [minDelta, maxDelta]', async () => {
    vi.mocked(getMessageCountLastHour).mockReturnValue(20);
    const modifier = new ChatActivityModifier();
    const { delta } = await modifier.apply(buildContext({ minDelta: 1, maxDelta: 3 }));
    expect(delta).toBeGreaterThanOrEqual(1);
    expect(delta).toBeLessThanOrEqual(3);
  });
});
