export const HISTORY_MODES = { cash: 5, carre: 3 } as const;
export const HISTORY_TYPES = [
  'silhouette',
  'flag',
  'country-from-capital',
  'capital',
  'neighbors',
] as const;
export const HISTORY_CONTINENTS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'] as const;
export interface RecordedAnswer {
  readonly id: string;
  readonly label: string;
}
export interface QuizAnswerEventV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly occurredAt: string;
  readonly sessionId: string;
  readonly questionIndex: number;
  readonly questionId: string;
  readonly questionType: string;
  readonly countryIso3: string;
  readonly continent: string;
  readonly mode: string;
  readonly answerType: 'country' | 'capital';
  readonly submittedAnswer: RecordedAnswer;
  readonly acceptedAnswers: readonly RecordedAnswer[];
  readonly correct: boolean;
  readonly pointsAwarded: number;
  readonly pointsPossible: number;
  readonly corpusVersion: string;
}
export interface AnswerSnapshot {
  readonly event: QuizAnswerEventV1;
  readonly generation: number | null;
}
