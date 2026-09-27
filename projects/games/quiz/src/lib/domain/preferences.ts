import type { QuestionType } from './types';

export const QUESTION_TYPES: readonly QuestionType[] = [
  'silhouette',
  'flag',
  'country-from-capital',
  'capital',
  'neighbors',
];
export type QuizPreferences = Readonly<Record<QuestionType, boolean>>;

/** Missing and unrecognized values stay enabled, including newly introduced categories. */
export function normalizePreferences(raw: unknown): QuizPreferences {
  const value =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    QUESTION_TYPES.map((type) => [type, value[type] !== false]),
  ) as QuizPreferences;
}

export function enabledQuestionTypes(preferences: QuizPreferences): readonly QuestionType[] {
  return QUESTION_TYPES.filter((type) => preferences[type] !== false);
}
