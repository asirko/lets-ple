import { describe, it, expect } from 'vitest';
import { parseAnswerEvent } from './validate-event';
import { answerFixture } from './fixtures';
describe('historical answers', () => {
  it('accepts canonical facts and rejects contradictions', () => {
    expect(parseAnswerEvent(answerFixture())).not.toBeNull();
    for (const value of [
      null,
      {},
      answerFixture({ schemaVersion: 2 } as never),
      answerFixture({ occurredAt: 'invalid' }),
      answerFixture({ pointsAwarded: Infinity }),
      answerFixture({ correct: false }),
      answerFixture({ countryIso3: 'xx' }),
      answerFixture({ mode: 'duo' }),
    ])
      expect(parseAnswerEvent(value)).toBeNull();
  });
  it('validates identity, date and recorded award', () => {
    expect(parseAnswerEvent(answerFixture({ id: 'other' }))).toBeNull();
    expect(parseAnswerEvent(answerFixture({ occurredAt: '2026-02-30T12:00:00.000Z' }))).toBeNull();
    expect(
      parseAnswerEvent(answerFixture({ mode: 'carre', pointsPossible: 3, pointsAwarded: 3 })),
    ).not.toBeNull();
    expect(
      parseAnswerEvent(answerFixture({ mode: 'cash', pointsPossible: 3, pointsAwarded: 3 })),
    ).toBeNull();
  });
  it('accepts multiple canonical capitals and a recognized incorrect answer', () => {
    expect(
      parseAnswerEvent(
        answerFixture({
          answerType: 'capital',
          questionType: 'capital',
          questionId: 'capital:FRA',
          submittedAnswer: { id: 'paris', label: 'Paris' },
          acceptedAnswers: [
            { id: 'paris', label: 'Paris' },
            { id: 'lyon', label: 'Lyon' },
          ],
        }),
      ),
    ).not.toBeNull();
    expect(
      parseAnswerEvent(
        answerFixture({
          correct: false,
          pointsAwarded: 0,
          submittedAnswer: { id: 'DEU', label: 'Allemagne' },
        }),
      ),
    ).not.toBeNull();
  });
});
