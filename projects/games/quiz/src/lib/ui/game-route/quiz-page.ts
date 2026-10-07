import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  signal,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { LpButton, LpPanel } from '@lets-ple/ui';
import { loadGeography } from '../../data/geography';
import { QuizStore } from '../../store/quiz.store';
import { LpQuizQuestion } from '../question/question';
import { LpQuizAnswers } from '../answers/answers';
import { LpQuizCorrection } from '../correction/correction';
import { LpQuizResult } from '../result/result';
import { LpQuizToolbar } from '../toolbar/toolbar';
import { QuizSettingsService } from '../../store/quiz-settings.service';
import type { QuizPreferences } from '../../domain/preferences';

@Component({
  selector: 'lp-quiz-page',
  imports: [
    LpButton,
    LpPanel,
    LpQuizQuestion,
    LpQuizAnswers,
    LpQuizResult,
    LpQuizToolbar,
    LpQuizCorrection,
  ],
  providers: [QuizStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The global game module travels with this lazy entry point, as in the other games.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss', '../../../styles/_quiz-correction.scss'],
  template: `
    <lp-quiz-toolbar
      [preferences]="settings.preferences()"
      (settingsSaved)="saveSettings($event)"
      (replay)="replay()"
    />
    <main class="quiz-shell">
      @if (settingsFailed()) {
        <p role="alert">{{ i18n.t('quiz.settings.error') }}</p>
      }
      @if (failed()) {
        <lp-panel
          ><p role="alert">{{ i18n.t('quiz.load.error') }}</p>
          <lp-button (click)="load()">{{ i18n.t('quiz.retry') }}</lp-button>
        </lp-panel>
      } @else if (store.state(); as state) {
        @if (state.phase === 'finished') {
          <lp-quiz-result
            [score]="state.score"
            [correct]="state.correctCount"
            [wrong]="state.wrongCount"
            (replay)="replay()"
          />
        } @else if (store.question(); as question) {
          <lp-quiz-question
            [question]="question"
            [number]="state.index + 1"
            [score]="state.score"
          />
          <lp-quiz-answers
            [state]="state"
            [domain]="store.domain()"
            [answerType]="question.answerType"
            [correctLabels]="store.correctLabels()"
            (modeChosen)="store.dispatch({ type: 'mode', mode: $event })"
            (answered)="store.dispatch({ type: 'answer', value: $event })"
            (next)="next()"
          />
          @if (state.phase === 'correction' && store.country(); as country) {
            <lp-quiz-correction
              [state]="state"
              [country]="country"
              [countries]="store.catalog()!.countries"
              [correctLabels]="store.correctLabels()"
              (next)="next()"
            />
          }
        }
      } @else if (store.catalog()) {
        <lp-panel>
          <p>{{ i18n.t('quiz.settings.empty') }}</p>
          <lp-button (click)="toolbar()?.openSettings()">{{
            i18n.t('quiz.settings.title')
          }}</lp-button>
        </lp-panel>
      } @else {
        <p role="status">{{ i18n.t('quiz.load.pending') }}</p>
      }
      <details class="quiz-credits">
        <summary>{{ i18n.t('quiz.credits') }}</summary>
        <p>{{ i18n.t('quiz.coverage') }}</p>
        <p>
          <a href="https://github.com/mledoze/countries">mledoze/countries</a> · ODbL-1.0 ·
          <a href="https://www.naturalearthdata.com/">Natural Earth</a> · Public domain ·
          <a href="https://github.com/lipis/flag-icons">flag-icons</a> · MIT
        </p>
        <a href="content/geography/countries.json" download>{{ i18n.t('quiz.download') }}</a>
      </details>
    </main>
  `,
})
export class QuizPage {
  protected readonly settings = inject(QuizSettingsService);
  protected readonly settingsFailed = signal(false);
  protected readonly toolbar = viewChild(LpQuizToolbar);
  protected readonly store = inject(QuizStore);
  protected readonly i18n = inject(I18nService);
  protected readonly failed = signal(false);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly question = viewChild(LpQuizQuestion);
  private controller = new AbortController();

  constructor() {
    this.destroyRef.onDestroy(() => this.controller.abort());
    void this.load();
  }
  protected async load(): Promise<void> {
    this.controller.abort();
    this.controller = new AbortController();
    const controller = this.controller;
    this.failed.set(false);
    try {
      const countries = await loadGeography(controller.signal);
      if (this.destroyRef.destroyed || controller.signal.aborted) return;
      this.store.start(countries);
      this.focusQuestion();
    } catch {
      if (!this.destroyRef.destroyed && !controller.signal.aborted) this.failed.set(true);
    }
  }
  protected next(): void {
    this.store.dispatch({ type: 'next' });
    this.focusQuestion();
  }
  protected replay(): void {
    this.store.start();
    this.focusQuestion();
  }
  protected saveSettings(preferences: QuizPreferences): void {
    const saved = this.settings.save(preferences);
    this.settingsFailed.set(!saved);
    if (saved) this.replay();
  }
  private focusQuestion(): void {
    afterNextRender(() => this.question()?.focus(), { injector: this.injector });
  }
}
