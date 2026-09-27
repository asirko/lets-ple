import type { Catalog } from './catalog';
import { matchesAnswer } from './catalog';
import { generateQuestions, optionsFor } from './questions';
import type { Answer, Mode, Question, QuestionType, Random } from './types';

export const POINTS: Readonly<Record<Mode, number>> = { cash: 5, carre: 3, duo: 1 };
export interface GameState {
  readonly questions: readonly Question[];
  readonly index: number;
  readonly phase: 'choosing' | 'answering' | 'correction' | 'finished';
  readonly score: number;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly mode: Mode | null;
  readonly options: readonly Answer[];
  readonly submittedAnswer: string | null;
  readonly correct: boolean | null;
  readonly awarded: number;
}
export type Action =
  | { readonly type: 'mode'; readonly mode: Mode }
  | { readonly type: 'answer'; readonly value: string }
  | { readonly type: 'next' };

export function createGame(
  catalog: Catalog,
  random: Random,
  enabled?: readonly QuestionType[],
): GameState {
  return {
    questions: generateQuestions(catalog, random, enabled),
    index: 0,
    phase: 'choosing',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    mode: null,
    options: [],
    submittedAnswer: null,
    correct: null,
    awarded: 0,
  };
}

export function reduceGame(
  state: GameState,
  action: Action,
  catalog: Catalog,
  random: Random = Math.random,
): GameState {
  const question = state.questions[state.index];
  switch (action.type) {
    case 'mode':
      if (state.phase !== 'choosing') return state;
      return {
        ...state,
        mode: action.mode,
        phase: 'answering',
        options: action.mode === 'cash' ? [] : optionsFor(question, catalog, action.mode, random),
      };
    case 'answer': {
      if (state.phase !== 'answering' || !state.mode) return state;
      const answer =
        state.mode === 'cash'
          ? catalog[question.answerType].find((a) => matchesAnswer(a, action.value))
          : state.options.find((a) => a.id === action.value);
      if (!answer) return state;
      const correct = question.correctAnswers.includes(answer.id);
      const awarded = correct ? POINTS[state.mode] : 0;
      return {
        ...state,
        phase: 'correction',
        submittedAnswer: answer.label,
        correct,
        awarded,
        score: state.score + awarded,
        correctCount: state.correctCount + Number(correct),
        wrongCount: state.wrongCount + Number(!correct),
      };
    }
    case 'next':
      if (state.phase !== 'correction') return state;
      if (state.index === state.questions.length - 1) return { ...state, phase: 'finished' };
      return {
        ...state,
        index: state.index + 1,
        phase: 'choosing',
        mode: null,
        options: [],
        submittedAnswer: null,
        correct: null,
        awarded: 0,
      };
  }
}
