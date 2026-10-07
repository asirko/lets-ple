import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  signal,
} from '@angular/core';
import { LpButton, type ComponentShowcase } from '@lets-ple/ui';
import type { GameState } from '../../domain/game';
import type { Question } from '../../domain/types';
import { QuizGlobeShowcase } from '../country-globe/country-globe.showcase';
import { LpQuizCorrection } from './correction';
const q: Question = {
  id: 'showcase',
  type: 'capital',
  countryCode: 'FRA',
  promptKey: 'quiz.prompt.capital',
  promptParams: { country: 'France' },
  answerType: 'capital',
  correctAnswers: ['paris'],
  data: { kind: 'text' },
};
@Component({
  selector: 'lp-quiz-correction-showcase',
  imports: [LpQuizCorrection, LpButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss', '../../../styles/_quiz-correction.scss'],
  template: `
    <div class="quiz-shell">
      <div class="quiz-progress"><span>Geoquizz</span><strong>12 / 50</strong></div>
      <div class="panel quiz-question">
        <h2>{{ i18n.t('quiz.prompt.capital', { country: country()?.name || 'France' }) }}</h2>
        <p>{{ i18n.t('quiz.choose.help') }}</p>
      </div>
      <lp-button (click)="show.set(true)">{{ i18n.t('quiz.showcase.open') }}</lp-button>
    </div>
    @if (show() && country(); as c) {
      <lp-quiz-correction
        [state]="state()"
        [country]="c"
        [countries]="countries()"
        [correctLabels]="c.capitals"
        [staticGlobe]="staticOnly()"
        (next)="show.set(false)"
      />
    }
  `,
})
export class QuizCorrectionShowcase extends QuizGlobeShowcase {
  readonly outcome = input('Bonne réponse');
  readonly lastQuestion = input(false);
  readonly show = signal(false);
  readonly state = computed<GameState>(() => ({
    questions: [q, q],
    index: this.lastQuestion() ? 1 : 0,
    phase: 'correction',
    score: 12,
    correctCount: 3,
    wrongCount: 1,
    mode: 'carre',
    options: [],
    submittedAnswer:
      this.outcome() === 'Bonne réponse' ? this.country()?.capitals[0] || 'Paris' : 'Rome',
    correct: this.outcome() === 'Bonne réponse',
    awarded: this.outcome() === 'Bonne réponse' ? 3 : 0,
  }));
}
export const QUIZ_CORRECTION_SHOWCASE: ComponentShowcase<QuizCorrectionShowcase> = {
  component: QuizCorrectionShowcase,
  controls: {
    countryCode: {
      kind: 'enum',
      options: ['FRA', 'JPN', 'NZL', 'ZAF', 'VAT', 'FJI', 'NRU'],
      default: 'FRA',
    },
    outcome: {
      kind: 'enum',
      options: ['Bonne réponse', 'Mauvaise réponse'],
      default: 'Bonne réponse',
    },
    lastQuestion: { kind: 'boolean', default: false },
    staticOnly: { kind: 'boolean', default: false },
    missingGeometry: { kind: 'boolean', default: false },
  },
};
