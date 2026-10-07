import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { IndexedDbHistory } from './indexeddb-history';
import { answerFixture } from '../domain/knowledge-stats/fixtures';
beforeEach(() => {
  Object.assign(globalThis, { indexedDB: new IDBFactory(), IDBKeyRange });
});
describe('IndexedDB history', () => {
  it('commits, deduplicates, and prevents resurrection after clearing', async () => {
    const repo = new IndexedDbHistory('test');
    const generation = await repo.open();
    const snapshot = { event: answerFixture(), generation };
    expect(await repo.append(snapshot)).toBe('stored');
    expect(await repo.append(snapshot)).toBe('duplicate');
    const read = await repo.beginRead();
    expect((await repo.readBatch(read, 0, 100)).events).toHaveLength(1);
    await repo.clear();
    expect(await repo.append(snapshot)).toBe('stale');
    await expect(repo.verifyRead(read)).rejects.toMatchObject({ code: 'changed' });
    repo.close();
  });
  it('bounds a read by insertion sequence rather than answer date', async () => {
    const repo = new IndexedDbHistory('test');
    const generation = await repo.open();
    await repo.append({ event: answerFixture(), generation });
    const read = await repo.beginRead();
    await repo.append({
      event: answerFixture({
        questionIndex: 1,
        id: answerFixture().sessionId + ':1',
        occurredAt: '2020-01-01T00:00:00.000Z',
      }),
      generation,
    });
    expect((await repo.readBatch(read, 0, 100)).events).toHaveLength(1);
    expect((await repo.readBatch(await repo.beginRead(), 0, 100)).events).toHaveLength(2);
    repo.close();
  });
  it('does not overwrite divergent events and shares clear generation between connections', async () => {
    const a = new IndexedDbHistory('test'),
      b = new IndexedDbHistory('test');
    const generation = await a.open();
    await b.open();
    const event = answerFixture();
    await a.append({ event, generation });
    await expect(
      a.append({ event: { ...event, occurredAt: '2026-10-06T00:00:00.000Z' }, generation }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await b.clear();
    expect(await a.append({ event, generation })).toBe('stale');
    a.close();
    b.close();
  });
});

it('rejects a future database version without changing it', async () => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('future', 2);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  db.close();
  const repo = new IndexedDbHistory('future');
  await expect(repo.open()).rejects.toMatchObject({ code: 'version' });
  repo.close();
});
it('rolls back quota failures and retries the same event', async () => {
  const repo = new IndexedDbHistory('quota'),
    generation = await repo.open();
  const spy = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementationOnce(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  await expect(repo.append({ event: answerFixture(), generation })).rejects.toMatchObject({
    code: 'quota',
  });
  spy.mockRestore();
  expect((await repo.beginRead()).highSequence).toBe(0);
  expect(await repo.append({ event: answerFixture(), generation })).toBe('stored');
  repo.close();
});
it('quarantines malformed rows and rejects corrupt metadata', async () => {
  const repo = new IndexedDbHistory('corrupt');
  await repo.open();
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = indexedDB.open('corrupt', 1);
    r.onsuccess = () => resolve(r.result);
  });
  let tx = db.transaction(['answers', 'metadata'], 'readwrite');
  tx.objectStore('answers').add({
    id: 'bad',
    generation: 0,
    insertionSequence: 1,
    event: { schemaVersion: 99 },
  });
  tx.objectStore('metadata').put(2, 'nextSequence');
  await new Promise((resolve) => (tx.oncomplete = resolve));
  const batch = await repo.readBatch(await repo.beginRead(), 0, 10);
  expect(batch.invalidCount).toBe(1);
  expect(batch.events).toHaveLength(0);
  tx = db.transaction('metadata', 'readwrite');
  tx.objectStore('metadata').put(-1, 'nextSequence');
  await new Promise((resolve) => (tx.oncomplete = resolve));
  await expect(repo.beginRead()).rejects.toMatchObject({ code: 'corrupt' });
  db.close();
  repo.close();
});

it('closes its connection when a future migration requests versionchange', async () => {
  const repo = new IndexedDbHistory('upgrade');
  await repo.open();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('upgrade', 2);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  expect(db.version).toBe(2);
  db.close();
  await expect(repo.open()).rejects.toMatchObject({ code: 'version' });
  repo.close();
});
