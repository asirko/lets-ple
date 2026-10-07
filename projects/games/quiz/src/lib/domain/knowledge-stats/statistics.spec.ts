import { describe, it, expect } from 'vitest';
import { answerFixture } from './fixtures';
import { createAccumulator, addAnswers, finishStatistics } from './statistics';
import { classifyKnowledge } from './knowledge-level';
const wrong = answerFixture({
  correct: false,
  pointsAwarded: 0,
  submittedAnswer: { id: 'DEU', label: 'Allemagne' },
});
describe('knowledge statistics', () => {
  it('weights by answer and keeps missing metrics null', () => {
    const acc = createAccumulator({ continent: null, mode: null }, []);
    expect(finishStatistics(acc).overall).toEqual({
      count: 0,
      successRate: null,
      averageScore: null,
    });
    addAnswers(acc, [answerFixture(), wrong]);
    expect(finishStatistics(acc).overall).toEqual({
      count: 2,
      successRate: 0.5,
      averageScore: 2.5,
    });
  });
  it('filters every aggregation consistently', () => {
    const acc = createAccumulator({ continent: 'Europe', mode: 'carre' }, []);
    addAnswers(acc, [
      answerFixture(),
      answerFixture({ mode: 'carre', pointsAwarded: 3, pointsPossible: 3 }),
      wrong,
    ]);
    const r = finishStatistics(acc);
    expect(r.overall.count).toBe(1);
    expect(r.byCountry.get('FRA')?.averageScore).toBe(3);
    expect([...r.byType.keys()]).toEqual(['flag']);
  });
  it('has exact sample and score thresholds', () => {
    const metrics = (count: number, averageScore: number | null) => ({
      count,
      averageScore,
      successRate: null,
    });
    expect(classifyKnowledge(metrics(0, null))).toBe('none');
    expect(classifyKnowledge(metrics(4, 5))).toBe('insufficient');
    expect(classifyKnowledge(metrics(5, 1.99))).toBe('low');
    expect(classifyKnowledge(metrics(5, 2))).toBe('medium');
    expect(classifyKnowledge(metrics(5, 3.5))).toBe('high');
  });
  it('uses inclusive start/exclusive end and preserves empty weeks', () => {
    const t = Date.parse('2026-10-07T12:00:00.000Z');
    const windows = [
      { startMs: t - 1, endMs: t, current: false },
      { startMs: t, endMs: t + 1, current: true },
    ];
    const acc = createAccumulator({ continent: null, mode: null }, windows);
    addAnswers(acc, [answerFixture()]);
    expect(finishStatistics(acc).weeks.map((w) => w.metrics.count)).toEqual([0, 1]);
    expect(finishStatistics(acc).weeks[0].metrics.averageScore).toBeNull();
  });
  it('reports practiced types without persisting any aggregates', () => {
    const acc = createAccumulator({ continent: null, mode: null }, []);
    addAnswers(acc, [
      answerFixture(),
      answerFixture({ questionType: 'silhouette', questionId: 'silhouette:FRA' }),
    ]);
    expect([...finishStatistics(acc).countryTypes.get('FRA')!]).toEqual(['flag', 'silhouette']);
  });
});
