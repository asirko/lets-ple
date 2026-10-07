import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import { QUIZ_HISTORY_DATABASE } from '@lets-ple/game-core';
import type { AnswerSnapshot, QuizAnswerEventV1 } from '../domain/knowledge-stats/events';
import { parseAnswerEvent } from '../domain/knowledge-stats/validate-event';
import {
  HistoryError,
  type QuizHistoryRepository,
  type ReadSnapshot,
  type HistoryBatch,
  type AppendResult,
} from './history-port';
interface Row {
  id: string;
  event: QuizAnswerEventV1;
  generation: number;
  insertionSequence: number;
}
interface Schema extends DBSchema {
  answers: {
    key: string;
    value: Row;
    indexes: { sequence: number; date: string; session: string; country: string };
  };
  metadata: { key: string; value: number };
}
export class IndexedDbHistory implements QuizHistoryRepository {
  private connection: Promise<IDBPDatabase<Schema>> | null = null;
  constructor(private readonly name = QUIZ_HISTORY_DATABASE) {}
  private db(): Promise<IDBPDatabase<Schema>> {
    if (!this.connection) {
      this.connection = new Promise<IDBPDatabase<Schema>>((resolve, reject) => {
        let blocked = false;
        openDB<Schema>(this.name, 1, {
          upgrade(db, oldVersion, _newVersion, tx) {
            if (oldVersion < 1) {
              const s = db.createObjectStore('answers', { keyPath: 'id' });
              s.createIndex('sequence', 'insertionSequence', { unique: true });
              s.createIndex('date', 'event.occurredAt');
              s.createIndex('session', 'event.sessionId');
              s.createIndex('country', 'event.countryIso3');
              db.createObjectStore('metadata');
              void tx.objectStore('metadata').put(0, 'generation');
              void tx.objectStore('metadata').put(1, 'nextSequence');
            }
          },
          blocked() {
            blocked = true;
            reject(new HistoryError('blocked'));
          },
          blocking: () => this.close(),
          terminated: () => {
            this.connection = null;
          },
        }).then(
          (db) => {
            if (blocked) {
              db.close();
              return;
            }
            resolve(db);
          },
          (e) =>
            reject(new HistoryError(e?.name === 'VersionError' ? 'version' : 'unavailable', e)),
        );
      }).catch((e) => {
        this.connection = null;
        throw e;
      });
    }
    return this.connection!;
  }
  async open(): Promise<number> {
    const db = await this.db();
    const g = await db.get('metadata', 'generation');
    if (!Number.isSafeInteger(g) || g! < 0) throw new HistoryError('corrupt');
    return g!;
  }
  async append(s: AnswerSnapshot): Promise<AppendResult> {
    if (!parseAnswerEvent(s.event)) throw new HistoryError('corrupt');
    const db = await this.db(),
      tx = db.transaction(['answers', 'metadata'], 'readwrite');
    try {
      const meta = tx.objectStore('metadata');
      const g = await meta.get('generation');
      if (s.generation !== g) {
        await tx.done;
        return 'stale';
      }
      const store = tx.objectStore('answers'),
        previous = await store.get(s.event.id);
      if (previous) {
        if (JSON.stringify(previous.event) !== JSON.stringify(s.event))
          throw new HistoryError('conflict');
        await tx.done;
        return 'duplicate';
      }
      const seq = await meta.get('nextSequence');
      if (!Number.isSafeInteger(seq) || seq! < 1) throw new HistoryError('corrupt');
      await store.add({ id: s.event.id, event: s.event, generation: g!, insertionSequence: seq! });
      await meta.put(seq! + 1, 'nextSequence');
      await tx.done;
      return 'stored';
    } catch (e) {
      try {
        tx.abort();
      } catch {}
      await tx.done.catch(() => {});
      if (e instanceof HistoryError) throw e;
      throw new HistoryError(
        (e as DOMException)?.name === 'QuotaExceededError' ? 'quota' : 'unavailable',
        e,
      );
    }
  }
  async beginRead(): Promise<ReadSnapshot> {
    const db = await this.db(),
      tx = db.transaction('metadata');
    const g = await tx.store.get('generation'),
      seq = await tx.store.get('nextSequence');
    await tx.done;
    if (!Number.isSafeInteger(g) || g! < 0 || !Number.isSafeInteger(seq) || seq! < 1)
      throw new HistoryError('corrupt');
    return { generation: g!, highSequence: seq! - 1 };
  }
  async readBatch(s: ReadSnapshot, after: number, limit: number): Promise<HistoryBatch> {
    const db = await this.db(),
      tx = db.transaction(['answers', 'metadata']);
    if ((await tx.objectStore('metadata').get('generation')) !== s.generation)
      throw new HistoryError('changed');
    const events: QuizAnswerEventV1[] = [],
      ids: string[] = [];
    let invalidCount = 0,
      lastSequence: number | null = null;
    if (after < s.highSequence) {
      const rows = await tx
        .objectStore('answers')
        .index('sequence')
        .getAll(IDBKeyRange.bound(after, s.highSequence, true, false), limit);
      for (const row of rows) {
        lastSequence = row.insertionSequence;
        const e = parseAnswerEvent(row.event);
        if (e && row.generation === s.generation && row.id === e.id) {
          events.push(e);
          ids.push(e.id);
        } else invalidCount++;
      }
    }
    await tx.done;
    return { events, ids, lastSequence, invalidCount };
  }
  async verifyRead(s: ReadSnapshot): Promise<void> {
    if ((await this.open()) !== s.generation) throw new HistoryError('changed');
  }
  async clear(): Promise<number> {
    const db = await this.db(),
      tx = db.transaction(['answers', 'metadata'], 'readwrite');
    const g = await tx.objectStore('metadata').get('generation');
    if (!Number.isSafeInteger(g)) throw new HistoryError('corrupt');
    await tx.objectStore('metadata').put(g! + 1, 'generation');
    await tx.objectStore('answers').clear();
    await tx.done;
    return g! + 1;
  }
  close(): void {
    const connection = this.connection;
    this.connection = null;
    if (connection)
      void connection.then(
        (db) => db.close(),
        () => {},
      );
  }
}
