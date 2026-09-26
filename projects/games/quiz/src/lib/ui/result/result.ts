import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@lets-ple/game-core';
import { LpButton, LpPanel } from '@lets-ple/ui';
@Component({
  selector: 'lp-quiz-result',
  imports: [LpButton, LpPanel, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lp-panel>
      <div class="quiz-result">
        <p class="quiz-eyebrow">{{ i18n.t('quiz.title') }}</p>
        <h2 #heading tabindex="-1">{{ i18n.t('quiz.finished') }}</h2>
        <p class="quiz-final-score">{{ score() }} <span>/ 50</span></p>
        <p>{{ i18n.t('quiz.correctCount', { n: correct() }) }}</p>
        <p>{{ i18n.t('quiz.wrongCount', { n: wrong() }) }}</p>
        <lp-button (click)="replay.emit()">{{ i18n.t('quiz.replay') }}</lp-button>
        <a class="quiz-home" routerLink="/">{{ i18n.t('quiz.home') }}</a>
      </div>
    </lp-panel>
  `,
})
export class LpQuizResult {
  readonly score = input.required<number>();
  readonly correct = input.required<number>();
  readonly wrong = input.required<number>();
  readonly replay = output<void>();
  protected readonly i18n = inject(I18nService);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  constructor() {
    effect(() => this.heading()?.nativeElement.focus());
  }
}
