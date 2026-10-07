import { describe, it, expect, vi } from 'vitest';
import { HistoryCoordinator } from './history-coordinator';
import { answerFixture } from '../domain/knowledge-stats/fixtures';
import type { QuizHistoryRepository } from './history-port';
const repository = () =>
  ({
    open: vi.fn().mockResolvedValue(0),
    append: vi.fn().mockResolvedValue('stored'),
    clear: vi.fn().mockResolvedValue(1),
  }) as unknown as QuizHistoryRepository;
describe('history coordination', () => {
  it('preserves failed writes temporarily and retries identical snapshots', async () => {
    const repo = repository();
    vi.mocked(repo.append).mockRejectedValueOnce(new Error('quota'));
    const c = new HistoryCoordinator(repo);
    await c.initialize();
    c.capture(answerFixture());
    await c.settled();
    expect(c.temporaryEvents()).toHaveLength(1);
    expect(c.status().kind).toBe('temporary');
    await c.retry();
    expect(c.temporaryEvents()).toHaveLength(0);
    expect(vi.mocked(repo.append).mock.calls[1][0].generation).toBe(0);
  });
  it('purges old pending data on clear without reassigning generation', async () => {
    const repo = repository();
    vi.mocked(repo.append).mockRejectedValue(new Error('quota'));
    const c = new HistoryCoordinator(repo);
    await c.initialize();
    c.capture(answerFixture());
    await c.settled();
    await c.clear();
    expect(c.temporaryEvents()).toHaveLength(0);
    c.capture(answerFixture());
    await c.settled();
    expect(vi.mocked(repo.append).mock.calls.at(-1)![0].generation).toBe(1);
  });
  it('does not erase the temporary queue when clear fails', async () => {
    const repo = repository();
    vi.mocked(repo.append).mockRejectedValue(new Error());
    vi.mocked(repo.clear).mockRejectedValue(new Error());
    const c = new HistoryCoordinator(repo);
    await c.initialize();
    c.capture(answerFixture());
    await c.settled();
    await expect(c.clear()).rejects.toThrow();
    expect(c.temporaryEvents()).toHaveLength(1);
  });
  it('limits pending memory and leaves unknown generations temporary', async () => {
    const repo = repository();
    vi.mocked(repo.open).mockRejectedValue(new Error());
    const c = new HistoryCoordinator(repo);
    await c.initialize();
    for (let i = 0; i < 1001; i++)
      c.capture(answerFixture({ questionIndex: i, id: answerFixture().sessionId + ':' + i }));
    await c.settled();
    expect(c.temporaryEvents()).toHaveLength(1000);
    expect(c.status().kind).toBe('full');
    expect(repo.append).not.toHaveBeenCalled();
  });
});

it('persists later known-generation answers behind unknown temporary answers', async () => {
  const repo = repository();
  vi.mocked(repo.open).mockRejectedValueOnce(new Error('unavailable'));
  const c = new HistoryCoordinator(repo);
  await c.initialize();
  c.capture(answerFixture());
  await c.settled();
  await c.retry();
  c.capture(answerFixture({ id: answerFixture().sessionId + ':1', questionIndex: 1 }));
  await c.settled();
  expect(repo.append).toHaveBeenCalledTimes(1);
  expect(c.temporaryEvents()).toHaveLength(1);
  expect(c.status().kind).toBe('temporary');
});

it('purges every old snapshot on stale append', async () => {
  const repo = repository();
  vi.mocked(repo.append).mockRejectedValue(new Error('quota'));
  const c = new HistoryCoordinator(repo);
  await c.initialize();
  c.capture(answerFixture());
  c.capture(answerFixture({ id: answerFixture().sessionId + ':1', questionIndex: 1 }));
  await c.settled();
  vi.mocked(repo.open).mockResolvedValue(1);
  vi.mocked(repo.append).mockResolvedValue('stale');
  c.capture(answerFixture({ id: answerFixture().sessionId + ':2', questionIndex: 2 }));
  await c.settled();
  expect(c.temporaryEvents()).toHaveLength(0);
});
