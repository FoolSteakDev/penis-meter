import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Telegraf } from 'telegraf';
import { describe, expect, it, vi } from 'vitest';
import { SEASON_START_DATE } from '../../src/config/constants';
import { GameStateModel } from '../../src/database/models/game-state.model';
import { UserModel } from '../../src/database/models/user.model';
import { processRoundTransitions } from '../../src/services/round-processor.service';

dayjs.extend(utc);

describe('processRoundTransitions - cold start (phase 1.2)', () => {
  it('starting fresh on round 5 sends only the theme announcement, no fake round-summary history', async () => {
    // Раунд 5 (день 28 від SEASON_START_DATE) - раунд 4 - останній раунд
    // сезону 1, тож старий баг ще й розіслав би фальшиве "Сезон завершено".
    const atRound5 = dayjs.utc(SEASON_START_DATE).add(28, 'day');

    // Активний юзер із чатом - інакше цикл догону не мав би куди слати
    // повідомлення, і тест був би істинним про що завгодно.
    await UserModel.create({ telegram_id: 1, first_name: 'Player', value: 10, chats: [555] });

    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const fakeBot = { telegram: { sendMessage } } as unknown as Telegraf;

    await processRoundTransitions(fakeBot, atRound5);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][1]).toContain('Нова тема тижня');

    const gameState = await GameStateModel.findOne();
    expect(gameState?.last_processed_round_number).toBe(4);
  });
});
