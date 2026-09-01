import { Schema, model, type HydratedDocument } from 'mongoose';
import type { QuestKind } from './quest.model';

export type QuestAssignmentStatus = 'active' | 'completed' | 'failed' | 'cancelled';

/** Знімок визначення на момент взяття — див. «Зафіксовані рішення», п.4. */
export interface QuestSnapshot {
  emoji: string;
  name: string;
  description: string;
  kind: QuestKind;
  rule: string;
  target: number;
  params: Record<string, unknown>;
  duration_minutes: number;
  reward_cm: number;
  penalty_cm: number;
}

export interface QuestAssignmentDocument {
  _id: Schema.Types.ObjectId;
  telegram_id: number;
  quest_code: string;
  /** Чат, де квест узято — туди йдуть анонси старту/фінішу. */
  chat_id: number;
  status: QuestAssignmentStatus;
  snapshot: QuestSnapshot;
  /** Накопичений прогрес (для 'reach'). Для 'avoid'/'hold' лишається 0. */
  progress: number;
  /** Унікальні ключі для правил із distinct-режимом (різні умови, різні дні). */
  hit_keys: string[];
  /** Довільний стан правила, зафіксований на старті: ранг у чаті, останній кривдник тощо. */
  baseline: Record<string, unknown>;
  started_at: Date;
  expires_at: Date;
  resolved_at: Date | null;
  /** Скільки см реально застосовано при закритті (зі знаком у бік мети). */
  applied_cm: number;
  reminder_sent_at: Date | null;
  /** id повідомлення з квестом у чаті — щоб відредагувати його при закритті. */
  chat_message_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export type QuestAssignmentHydratedDocument = HydratedDocument<QuestAssignmentDocument>;

const questSnapshotSchema = new Schema<QuestSnapshot>(
  {
    emoji: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    kind: { type: String, enum: ['reach', 'avoid', 'hold'], required: true },
    rule: { type: String, required: true },
    target: { type: Number, required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    duration_minutes: { type: Number, required: true },
    reward_cm: { type: Number, required: true },
    penalty_cm: { type: Number, required: true },
  },
  { _id: false },
);

const questAssignmentSchema = new Schema<QuestAssignmentDocument>(
  {
    telegram_id: { type: Number, required: true },
    quest_code: { type: String, required: true },
    chat_id: { type: Number, required: true },
    status: { type: String, enum: ['active', 'completed', 'failed', 'cancelled'], required: true, default: 'active' },
    snapshot: { type: questSnapshotSchema, required: true },
    progress: { type: Number, required: true, default: 0 },
    hit_keys: { type: [String], default: [] },
    baseline: { type: Schema.Types.Mixed, default: {} },
    started_at: { type: Date, required: true },
    expires_at: { type: Date, required: true },
    resolved_at: { type: Date, default: null },
    applied_cm: { type: Number, required: true, default: 0 },
    reminder_sent_at: { type: Date, default: null },
    chat_message_id: { type: Number, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// TTL-індексу немає навмисно — журнал призначень і є «облік по кожному
// юзеру» з ТЗ, документ ~400 байт, зберігається назавжди.
questAssignmentSchema.index({ telegram_id: 1, status: 1 });
questAssignmentSchema.index({ status: 1, expires_at: 1 });
questAssignmentSchema.index({ telegram_id: 1, quest_code: 1, resolved_at: -1 });

// Захист від дабл-кліку по «✅ Взяти»: другий insert під час гонки впаде E11000.
questAssignmentSchema.index(
  { telegram_id: 1, quest_code: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export const QuestAssignmentModel = model<QuestAssignmentDocument>('QuestAssignment', questAssignmentSchema);
