import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import type { GameState } from '../../domain/game';
import { LpQuizAnswers } from './answers';

const initial: GameState = {
  questions: [],
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
const options = ['France', 'Espagne', 'Portugal', 'Italie'].map((label) => ({
  id: label,
  label,
  aliases: [],
  countryCodes: [],
}));
@Component({
  selector: 'lp-quiz-answers-showcase',
  imports: [LpQuizAnswers],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss'],
  template: `<lp-quiz-answers
    [state]="state()"
    [domain]="domain"
    answerType="country"
    [correctLabels]="['France']"
  />`,
})
export class QuizAnswersShowcase {
  readonly state = input.required<GameState>();
  readonly domain = options;
}
export const QUIZ_ANSWERS_SHOWCASE: ComponentShowcase<QuizAnswersShowcase> = {
  component: QuizAnswersShowcase,
  controls: {
    state: {
      kind: 'preset',
      default: 'Choix du mode',
      options: {
        'Choix du mode': () => initial,
        Cash: () => ({ ...initial, phase: 'answering', mode: 'cash' }),
        Carré: () => ({ ...initial, phase: 'answering', mode: 'carre', options }),
      },
    },
  },
};
