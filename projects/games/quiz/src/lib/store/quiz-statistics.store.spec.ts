import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { QuizStatisticsStore } from './quiz-statistics.store';
import { QuizHistoryService } from './quiz-history.service';
import { answerFixture } from '../domain/knowledge-stats/fixtures';
import * as data from '../data/knowledge-data';
describe('statistics reader', () => {
  it('deduplicates temporary events and rejects stale filtered reads', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () =>
            Array.from({ length: 195 }, (_, i) => ({
              iso3:
                i === 0
                  ? 'FRA'
                  : 'A' +
                    String.fromCharCode(65 + Math.floor(i / 26)) +
                    String.fromCharCode(65 + (i % 26)),
              name: 'Pays ' + i,
              continent: 'Europe',
              anchor: [2, 46],
            })),
        }),
    );
    const repository = {
      beginRead: vi.fn().mockResolvedValue({ generation: 0, highSequence: 1 }),
      readBatch: vi
        .fn()
        .mockResolvedValue({
          events: [answerFixture()],
          ids: [answerFixture().id],
          lastSequence: 1,
          invalidCount: 0,
        }),
      verifyRead: vi.fn().mockResolvedValue(undefined),
    };
    const history = {
      ready: Promise.resolve(),
      revision: signal(0),
      repository,
      coordinator: {
        temporaryEvents: () => [answerFixture()],
        status: () => ({ kind: 'temporary', pending: 1 }),
      },
    };
    TestBed.configureTestingModule({
      providers: [QuizStatisticsStore, { provide: QuizHistoryService, useValue: history }],
    });
    const store = TestBed.inject(QuizStatisticsStore);
    await store.refresh();
    expect(store.result()!.overall.count).toBe(1);
    repository.beginRead.mockRejectedValueOnce(new Error('unavailable'));
    await store.refresh();
    expect(store.result()!.overall.count).toBe(1);
    expect(store.loadState()).toBe('incomplete');
    store.setContinent('Africa');
    await store.refresh();
    expect(store.result()!.overall.count).toBe(0);
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
