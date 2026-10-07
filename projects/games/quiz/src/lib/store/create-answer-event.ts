import type { Catalog } from '../domain/catalog';
import { matchesAnswer } from '../domain/catalog';
import { POINTS, type GameState, type Action } from '../domain/game';
import type { QuizAnswerEventV1 } from '../domain/knowledge-stats/events';
export function createAnswerEvent(
  before: GameState,
  after: GameState,
  action: Action,
  catalog: Catalog,
  sessionId: string,
  corpusVersion: string,
): QuizAnswerEventV1 | null {
  if (
    action.type !== 'answer' ||
    before.phase !== 'answering' ||
    after.phase !== 'correction' ||
    !after.mode ||
    after.correct === null
  )
    return null;
  const q = before.questions[before.index];
  const domain = catalog[q.answerType];
  const submitted = domain.find((a) =>
    after.mode === 'cash' ? matchesAnswer(a, action.value) : a.id === action.value,
  );
  const country = catalog.countries.find((c) => c.iso3 === q.countryCode);
  if (!submitted || !country) return null;
  return {
    schemaVersion: 1,
    id: sessionId + ':' + before.index,
    sessionId,
    questionIndex: before.index,
    occurredAt: new Date().toISOString(),
    questionId: q.id,
    questionType: q.type,
    countryIso3: q.countryCode,
    continent: country.continent,
    mode: after.mode,
    answerType: q.answerType,
    submittedAnswer: { id: submitted.id, label: submitted.label },
    acceptedAnswers: domain
      .filter((a) => q.correctAnswers.includes(a.id))
      .map((a) => ({ id: a.id, label: a.label })),
    correct: after.correct,
    pointsAwarded: after.awarded,
    pointsPossible: POINTS[after.mode],
    corpusVersion,
  };
}
