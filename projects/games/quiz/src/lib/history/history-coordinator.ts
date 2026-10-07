import type { QuizAnswerEventV1, AnswerSnapshot } from '../domain/knowledge-stats/events';
import type { QuizHistoryRepository } from './history-port';
export interface HistoryStatus {
  kind: 'durable' | 'pending' | 'temporary' | 'full' | 'error';
  pending: number;
  error?: unknown;
}
export class HistoryCoordinator {
  private generation: number | null = null;
  private queue: AnswerSnapshot[] = [];
  private tail: Promise<void> = Promise.resolve();
  private clearing = false;
  private state: HistoryStatus = { kind: 'pending', pending: 0 };
  constructor(
    readonly repository: QuizHistoryRepository,
    private readonly changed: () => void = () => {},
  ) {}
  status(): HistoryStatus {
    return this.state;
  }
  private update(kind: HistoryStatus['kind'], error?: unknown): void {
    this.state = {
      kind: this.queue.length >= 1000 ? 'full' : kind,
      pending: this.queue.length,
      error,
    };
    this.changed();
  }
  async initialize(): Promise<void> {
    try {
      this.generation = await this.repository.open();
      this.update(this.queue.length ? 'temporary' : 'durable');
    } catch (e) {
      this.update('temporary', e);
    }
  }
  capture(event: QuizAnswerEventV1): void {
    if (this.clearing) {
      this.update('error', new Error('clear-in-progress'));
      return;
    }
    if (this.queue.some((s) => s.event.id === event.id)) return;
    if (this.queue.length >= 1000) {
      this.update('full');
      return;
    }
    this.queue.push({ event: structuredClone(event), generation: this.generation });
    this.update('pending');
    this.tail = this.tail.then(() => this.flush()).catch((e) => this.update('temporary', e));
  }
  temporaryEvents(): readonly QuizAnswerEventV1[] {
    return this.queue.map((s) => s.event);
  }
  settled(): Promise<void> {
    return this.tail;
  }
  private async flush(): Promise<void> {
    while (this.queue.some((s) => s.generation !== null)) {
      const index = this.queue.findIndex((s) => s.generation !== null);
      const s = this.queue[index];
      try {
        const result = await this.repository.append(s);
        this.queue.splice(index, 1);
        if (result === 'stale') {
          this.queue = [];
          this.generation = await this.repository.open();
          this.update('error', new Error('history-cleared-in-another-tab'));
          return;
        }
        this.changed();
      } catch (e) {
        this.update('temporary', e);
        return;
      }
    }
    this.update(this.queue.length ? 'temporary' : 'durable');
  }
  async retry(): Promise<void> {
    await this.refreshGeneration();
    this.tail = this.tail.then(() => this.flush());
    await this.tail;
  }
  async refreshGeneration(cleared = false): Promise<void> {
    try {
      const g = await this.repository.open();
      if (cleared || (this.generation !== null && g !== this.generation)) {
        this.queue = [];
        this.update('error', new Error('history-cleared-in-another-tab'));
      }
      this.generation = g;
    } catch (e) {
      this.update('temporary', e);
    }
  }
  async clear(): Promise<void> {
    this.clearing = true;
    try {
      await this.tail;
      const g = await this.repository.clear();
      this.queue = [];
      this.generation = g;
      this.update('durable');
    } catch (e) {
      this.update('error', e);
      throw e;
    } finally {
      this.clearing = false;
    }
  }
}
