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
import { I18nService } from '@lets-ple/game-core';
import { LpButton, LpPanel } from '@lets-ple/ui';
import { POINTS, type GameState } from '../../domain/game';
import type { Answer, AnswerType, Mode } from '../../domain/types';
import { LpCashAnswer } from '../cash-answer/cash-answer';

@Component({
  selector: 'lp-quiz-answers',
  imports: [LpCashAnswer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state().phase === 'choosing') {
      <fieldset class="quiz-mode-picker">
        <legend>{{ i18n.t('quiz.choose') }}</legend>
        <p class="quiz-hint">{{ i18n.t('quiz.choose.help') }}</p>
        <div class="quiz-modes">
          @for (mode of modes; track mode) {
            <button
              class="b-button b-secondary quiz-mode"
              type="button"
              (click)="modeChosen.emit(mode)"
            >
              <strong>{{ i18n.t('quiz.mode.' + mode) }}</strong>
              <span>{{ i18n.t('quiz.points', { n: points[mode] }) }}</span>
              <small>{{ i18n.t('quiz.mode.help.' + mode) }}</small>
            </button>
          }
        </div>
      </fieldset>
    }
    @if (state().phase === 'answering') {
      <p class="quiz-hint">
        {{ i18n.t('quiz.mode.' + state().mode) }} ·
        {{ i18n.t('quiz.points', { n: points[state().mode!] }) }}
      </p>
      @if (state().mode === 'cash') {
        <lp-cash-answer
          [domain]="domain()"
          [answerType]="answerType()"
          (answered)="answered.emit($event)"
        />
      } @else {
        <div class="quiz-options" role="group" [attr.aria-label]="i18n.t('quiz.options')">
          @for (answer of state().options; track answer.id; let index = $index) {
            <button
              #option
              class="b-button b-secondary quiz-option"
              type="button"
              (click)="answered.emit(answer.id)"
            >
              <span aria-hidden="true">{{ letters[index] }}</span
              >{{ answer.label }}
            </button>
          }
        </div>
      }
    }

  `,
})
export class LpQuizAnswers {
  readonly state = input.required<GameState>();
  readonly domain = input.required<readonly Answer[]>();
  readonly answerType = input.required<AnswerType>();
  readonly correctLabels = input.required<readonly string[]>();
  readonly modeChosen = output<Mode>();
  readonly answered = output<string>();
  readonly next = output<void>();
  protected readonly i18n = inject(I18nService);
  protected readonly modes: readonly Mode[] = ['cash', 'carre'];
  protected readonly points = POINTS;
  protected readonly letters = ['A', 'B', 'C', 'D'];
  private readonly feedback = viewChild<ElementRef<HTMLElement>>('feedback');
  private readonly firstOption = viewChild<ElementRef<HTMLButtonElement>>('option');
  constructor() {
    effect(() => this.feedback()?.nativeElement.focus());
    effect(() => this.firstOption()?.nativeElement.focus());
  }
}
