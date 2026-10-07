import { HISTORY_MODES, HISTORY_TYPES, HISTORY_CONTINENTS, type QuizAnswerEventV1 } from './events';
const text = (v: unknown, max = 256): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const answer = (v: unknown): boolean => record(v) && text(v['id']) && text(v['label']);
export function parseAnswerEvent(value: unknown): QuizAnswerEventV1 | null {
  if (!record(value)) return null;
  const e = value;
  if (
    e['schemaVersion'] !== 1 ||
    !text(e['sessionId']) ||
    !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(e['sessionId'])
  )
    return null;
  if (
    !Number.isInteger(e['questionIndex']) ||
    (e['questionIndex'] as number) < 0 ||
    (e['questionIndex'] as number) > 999
  )
    return null;
  if (e['id'] !== e['sessionId'] + ':' + e['questionIndex']) return null;
  if (
    !text(e['occurredAt']) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(e['occurredAt'])
  )
    return null;
  const date = new Date(e['occurredAt']);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== e['occurredAt']) return null;
  if (!text(e['countryIso3']) || !/^[A-Z]{3}$/.test(e['countryIso3'])) return null;
  if (
    !HISTORY_TYPES.includes(e['questionType'] as never) ||
    e['questionId'] !== e['questionType'] + ':' + e['countryIso3']
  )
    return null;
  if (
    !HISTORY_CONTINENTS.includes(e['continent'] as never) ||
    !Object.hasOwn(HISTORY_MODES, e['mode'] as string)
  )
    return null;
  if (e['answerType'] !== (e['questionType'] === 'capital' ? 'capital' : 'country')) return null;
  if (
    !answer(e['submittedAnswer']) ||
    !Array.isArray(e['acceptedAnswers']) ||
    !e['acceptedAnswers'].length ||
    e['acceptedAnswers'].length > 32 ||
    !e['acceptedAnswers'].every(answer)
  )
    return null;
  const ids = e['acceptedAnswers'].map((a) => (a as { id: string }).id);
  if (new Set(ids).size !== ids.length || typeof e['correct'] !== 'boolean') return null;
  if (e['correct'] !== ids.includes((e['submittedAnswer'] as { id: string }).id)) return null;
  if (
    e['pointsPossible'] !== HISTORY_MODES[e['mode'] as keyof typeof HISTORY_MODES] ||
    e['pointsAwarded'] !== (e['correct'] ? e['pointsPossible'] : 0) ||
    !text(e['corpusVersion'])
  )
    return null;
  return value as unknown as QuizAnswerEventV1;
}
