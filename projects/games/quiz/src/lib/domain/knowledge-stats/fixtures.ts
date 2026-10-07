import type { QuizAnswerEventV1 } from './events';
export function answerFixture(overrides: Partial<QuizAnswerEventV1> = {}): QuizAnswerEventV1 {
  const sessionId = '00000000-0000-4000-8000-000000000001';
  return {
    schemaVersion: 1,
    id: sessionId + ':0',
    sessionId,
    questionIndex: 0,
    occurredAt: '2026-10-07T12:00:00.000Z',
    questionId: 'flag:FRA',
    questionType: 'flag',
    countryIso3: 'FRA',
    continent: 'Europe',
    mode: 'cash',
    answerType: 'country',
    submittedAnswer: { id: 'FRA', label: 'France' },
    acceptedAnswers: [{ id: 'FRA', label: 'France' }],
    correct: true,
    pointsAwarded: 5,
    pointsPossible: 5,
    corpusVersion: 'test-v1',
    ...overrides,
  };
}
