import type { AnswerSnapshot, QuizAnswerEventV1 } from '../domain/knowledge-stats/events';
export type AppendResult = 'stored' | 'duplicate' | 'stale';
export interface ReadSnapshot {
  generation: number;
  highSequence: number;
}
export interface HistoryBatch {
  events: readonly QuizAnswerEventV1[];
  lastSequence: number | null;
  invalidCount: number;
  ids: readonly string[];
}
export interface QuizHistoryRepository {
  open(): Promise<number>;
  append(s: AnswerSnapshot): Promise<AppendResult>;
  beginRead(): Promise<ReadSnapshot>;
  readBatch(s: ReadSnapshot, after: number, limit: number): Promise<HistoryBatch>;
  verifyRead(s: ReadSnapshot): Promise<void>;
  clear(): Promise<number>;
  close(): void;
}
export class HistoryError extends Error {
  constructor(
    readonly code:
      'unavailable' | 'quota' | 'blocked' | 'version' | 'conflict' | 'changed' | 'corrupt',
    cause?: unknown,
  ) {
    super(code, { cause });
  }
}
