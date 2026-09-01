import type { Telegraf } from 'telegraf';
import { getOrCreateProgress } from '../achievements/achievement-progress.service';
import { QuestAssignmentModel, type QuestAssignmentHydratedDocument } from '../database/models/quest-assignment.model';
import { UserModel } from '../database/models/user.model';
import { getQuestSettings } from './quest-settings.service';
import { announceQuestReminder } from './quest-announce';
import { computeChatAverageGrowth, computeChatStanding } from './quest-standings.util';
import { resolveOnExpiry } from './quest.engine';
import { getQuestRule, QUEST_RULES, type QuestHoldContext } from './quest.rules';
import { resolveAssignment } from './quest.service';

const POLLABLE_HOLD_RULE_CODES = QUEST_RULES.filter((r) => r.kind === 'hold' && r.pollable).map((r) => r.code);

async function buildHoldContext(assignment: QuestAssignmentHydratedDocument): Promise<QuestHoldContext | null> {
  const user = await UserModel.findOne({ telegram_id: assignment.telegram_id });
  if (!user) {
    return null;
  }

  const [standing, chatAverageGrowth, achievementProgress] = await Promise.all([
    computeChatStanding(assignment.chat_id, assignment.telegram_id),
    computeChatAverageGrowth(assignment.chat_id, assignment.telegram_id),
    getOrCreateProgress(assignment.telegram_id),
  ]);

  return {
    user,
    assignment,
    chatRank: standing.rank,
    chatSize: standing.size,
    chatAverageGrowth,
    totalMeasurementsCount: achievementProgress.counters?.get('total_measurements') ?? 0,
  };
}

/** Резолв на дедлайні (avoid -> completed, reach -> failed, hold -> за предикатом). */
async function resolveExpired(bot: Telegraf): Promise<void> {
  const expired = await QuestAssignmentModel.find({ status: 'active', expires_at: { $lte: new Date() } });

  for (const assignment of expired) {
    try {
      const rule = getQuestRule(assignment.snapshot.rule);
      if (!rule) {
        console.error(`[quest-sweeper] unknown rule "${assignment.snapshot.rule}" on assignment ${assignment.id}`);
        continue;
      }
      const holdCtx = rule.kind === 'hold' ? await buildHoldContext(assignment) : null;
      const outcome = resolveOnExpiry(assignment, rule, holdCtx);
      await resolveAssignment(assignment, outcome, bot.telegram);
    } catch (error) {
      console.error(`[quest-sweeper] failed to resolve expired assignment ${assignment.id}`, error);
    }
  }
}

/**
 * Дострокова поразка для pollable hold-правил (жодне стартове правило зараз
 * такого не потребує — 5 hold-квестів перевіряються лише на дедлайні;
 * гачок лишається для майбутніх правил, де стан незворотний).
 */
async function pollEarlyFailures(bot: Telegraf): Promise<void> {
  if (POLLABLE_HOLD_RULE_CODES.length === 0) {
    return;
  }

  const candidates = await QuestAssignmentModel.find({
    status: 'active',
    'snapshot.rule': { $in: POLLABLE_HOLD_RULE_CODES },
  });

  for (const assignment of candidates) {
    try {
      const rule = getQuestRule(assignment.snapshot.rule);
      if (!rule?.evaluate) continue;
      const holdCtx = await buildHoldContext(assignment);
      if (!holdCtx) continue;
      if (!rule.evaluate(holdCtx)) {
        await resolveAssignment(assignment, 'failed', bot.telegram);
      }
    } catch (error) {
      console.error(`[quest-sweeper] failed to poll assignment ${assignment.id}`, error);
    }
  }
}

async function sendReminders(bot: Telegraf): Promise<void> {
  const settings = await getQuestSettings();
  if (settings.reminder_before_minutes <= 0) {
    return;
  }

  const threshold = new Date(Date.now() + settings.reminder_before_minutes * 60 * 1000);
  const due = await QuestAssignmentModel.find({
    status: 'active',
    reminder_sent_at: null,
    expires_at: { $lte: threshold },
  });

  for (const assignment of due) {
    try {
      const user = await UserModel.findOne({ telegram_id: assignment.telegram_id });
      if (!user) continue;
      const minutesLeft = Math.max(0, Math.round((assignment.expires_at.getTime() - Date.now()) / 60000));
      await announceQuestReminder(bot.telegram, user, assignment, minutesLeft);
      await QuestAssignmentModel.updateOne({ _id: assignment._id }, { $set: { reminder_sent_at: new Date() } });
    } catch (error) {
      console.error(`[quest-sweeper] failed to send reminder for assignment ${assignment.id}`, error);
    }
  }
}

/** Крон-джоба (bot/scheduler.ts), раз на хвилину — таймери квестів індивідуальні й короткі, на відміну від дуелей. */
export async function sweepQuests(bot: Telegraf): Promise<void> {
  await resolveExpired(bot);
  await pollEarlyFailures(bot);
  await sendReminders(bot);
}
