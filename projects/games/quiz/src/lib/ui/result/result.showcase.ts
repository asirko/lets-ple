import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpQuizResult } from './result';
@Component({
  selector: 'lp-quiz-result-showcase',
  imports: [LpQuizResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss'],
  template: `<lp-quiz-result [score]="score()" [correct]="correct()" [wrong]="10 - correct()" />`,
})
export class QuizResultShowcase {
  readonly score = input(37);
  readonly correct = input(8);
}
export const QUIZ_RESULT_SHOWCASE: ComponentShowcase<QuizResultShowcase> = {
  component: QuizResultShowcase,
  controls: { score: { kind: 'number', default: 37 }, correct: { kind: 'number', default: 8 } },
};
