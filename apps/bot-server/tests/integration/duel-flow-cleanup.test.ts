import type { Context } from 'telegraf';
import { describe, expect, it, vi } from 'vitest';
import { UserModel } from '../../src/database/models/user.model';
import { handleDuelAutoStakeAction, handleDuelStakeReply } from '../../src/bot/commands/duel.command';
import { createDraftChallenge, recordFlowMessage, recordStakePrompt } from '../../src/services/duel.service';

const CHAT_ID = 1;
const CHALLENGER_ID = 10;
const TARGET_ID = 20;
const FLOW_MESSAGE_ID = 100;
const PROMPT_MESSAGE_ID = 101;

async function seedUsers() {
  await UserModel.create({ telegram_id: CHALLENGER_ID, username: 'challenger', first_name: 'Challenger', value: 50, chats: [CHAT_ID] });
  await UserModel.create({ telegram_id: TARGET_ID, username: 'target', first_name: 'Target', value: 50, chats: [CHAT_ID] });
}

function fakeStakeReplyCtx(text: string, replyMessageId: number, telegram: Record<string, ReturnType<typeof vi.fn>>) {
  return {
    message: {
      text,
      message_id: replyMessageId,
      reply_to_message: { message_id: PROMPT_MESSAGE_ID },
    },
    chat: { id: CHAT_ID },
    from: { id: CHALLENGER_ID },
    telegram,
    reply: vi.fn().mockResolvedValue({ message_id: replyMessageId + 1000 }),
  } as unknown as Context;
}

describe('handleDuelStakeReply - flow message cleanup (phase 2)', () => {
  it('deletes flow/prompt/reply messages once a valid stake finalizes the challenge', async () => {
    await seedUsers();
    const draft = await createDraftChallenge(CHAT_ID, CHALLENGER_ID, TARGET_ID);
    await recordFlowMessage(draft.id, FLOW_MESSAGE_ID);
    await recordStakePrompt(draft.id, PROMPT_MESSAGE_ID);

    const telegram = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 999 }),
      deleteMessages: vi.fn().mockResolvedValue(true),
    };
    const ctx = fakeStakeReplyCtx('5', 102, telegram);
    const next = vi.fn().mockResolvedValue(undefined);

    await handleDuelStakeReply(ctx, next);

    expect(telegram.deleteMessages).toHaveBeenCalledWith(CHAT_ID, [FLOW_MESSAGE_ID, PROMPT_MESSAGE_ID, 102]);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not delete anything for an out-of-bounds stake, and later cleans up the warning too', async () => {
    await seedUsers();
    const draft = await createDraftChallenge(CHAT_ID, CHALLENGER_ID, TARGET_ID);
    await recordFlowMessage(draft.id, FLOW_MESSAGE_ID);
    await recordStakePrompt(draft.id, PROMPT_MESSAGE_ID);

    const telegram = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 999 }),
      deleteMessages: vi.fn().mockResolvedValue(true),
    };

    const invalidReplyMessageId = 200;
    const warnMessageId = invalidReplyMessageId + 1000; // fakeStakeReplyCtx's reply mock returns replyMessageId + 1000.
    const invalidCtx = fakeStakeReplyCtx('9999', invalidReplyMessageId, telegram);
    await handleDuelStakeReply(invalidCtx, vi.fn());

    expect(telegram.deleteMessages).not.toHaveBeenCalled();
    expect(invalidCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Введи число'));

    const validCtx = fakeStakeReplyCtx('5', 201, telegram);
    await handleDuelStakeReply(validCtx, vi.fn());

    expect(telegram.deleteMessages).toHaveBeenCalledWith(CHAT_ID, [
      FLOW_MESSAGE_ID,
      PROMPT_MESSAGE_ID,
      201,
      warnMessageId,
      invalidReplyMessageId,
    ]);
  });
});

describe('handleDuelAutoStakeAction - flow message cleanup (phase 2)', () => {
  it('does not delete the flow message when the invite fails to deliver', async () => {
    await seedUsers();
    const draft = await createDraftChallenge(CHAT_ID, CHALLENGER_ID, TARGET_ID);
    await recordFlowMessage(draft.id, FLOW_MESSAGE_ID);

    const telegram = {
      sendMessage: vi.fn().mockRejectedValue(new Error('Telegram API down')),
      deleteMessages: vi.fn().mockResolvedValue(true),
    };
    const ctx = {
      callbackQuery: { data: `d:auto:${draft.id}`, message: { message_id: FLOW_MESSAGE_ID } },
      from: { id: CHALLENGER_ID },
      chat: { id: CHAT_ID },
      telegram,
      answerCbQuery: vi.fn().mockResolvedValue(undefined),
    } as unknown as Context;

    await handleDuelAutoStakeAction(ctx);

    expect(telegram.deleteMessages).not.toHaveBeenCalled();
  });
});
