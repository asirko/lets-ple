import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { LpPanel } from '@lets-ple/ui';
import { silhouette } from '../../domain/silhouette';
import type { Question } from '../../domain/types';

@Component({
  selector: 'lp-quiz-question',
  imports: [LpPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quiz-progress">
      <span>{{ i18n.t('quiz.progress', { n: number() }) }}</span>
      <strong>{{ i18n.t('quiz.points', { n: score() }) }}</strong>
    </div>
    <progress
      class="quiz-progress-bar"
      [value]="number() - 1"
      max="10"
      [attr.aria-label]="i18n.t('quiz.progress.label')"
    ></progress>
    <lp-panel>
      <div class="quiz-question">
        <p class="quiz-eyebrow">{{ i18n.t('quiz.category.' + question().type) }}</p>
        <h2 #heading tabindex="-1">{{ i18n.t(question().promptKey, question().promptParams) }}</h2>
        @switch (question().data.kind) {
          @case ('flag') {
            <img
              class="quiz-flag"
              [src]="flagSrc()"
              [alt]="i18n.t('quiz.flag.alt')"
              draggable="false"
            />
          }
          @case ('silhouette') {
            @if (shape(); as shape) {
              <svg
                class="quiz-silhouette"
                [attr.viewBox]="shape.viewBox"
                role="img"
                [attr.aria-label]="i18n.t('quiz.silhouette.alt')"
              >
                <path [attr.d]="shape.path" fill-rule="evenodd" />
              </svg>
            }
          }
          @case ('neighbors') {
            <ul class="quiz-neighbors">
              @for (name of neighborNames(); track name) {
                <li>{{ name }}</li>
              }
            </ul>
          }
          @case ('text') {
            <div class="quiz-compass" aria-hidden="true">✦</div>
          }
        }
      </div>
    </lp-panel>
  `,
})
export class LpQuizQuestion {
  readonly question = input.required<Question>();
  readonly number = input.required<number>();
  readonly score = input.required<number>();
  protected readonly i18n = inject(I18nService);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  protected readonly shape = computed(() => {
    const data = this.question().data;
    return data.kind === 'silhouette' ? silhouette(data.geometry) : null;
  });
  protected readonly flagSrc = computed(() => {
    const data = this.question().data;
    return data.kind === 'flag' ? data.src : '';
  });
  protected readonly neighborNames = computed(() => {
    const data = this.question().data;
    return data.kind === 'neighbors' ? data.names : [];
  });
  focus(): void {
    this.heading()?.nativeElement.focus();
  }
}
