import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@lets-ple/game-core';
import { LpButton, LpDialog } from '@lets-ple/ui';
import {
  QUESTION_TYPES,
  enabledQuestionTypes,
  normalizePreferences,
  type QuizPreferences,
} from '../../domain/preferences';
import type { QuestionType } from '../../domain/types';

@Component({
  selector: 'lp-quiz-toolbar',
  imports: [RouterLink, LpButton, LpDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'quiz-toolbar', '(document:click)': 'onDocumentClick($event)' },
  template: `
    <header class="quiz-toolbar-heading">
      <a class="quiz-toolbar-back" routerLink="/" [attr.aria-label]="i18n.t('quiz.home')">←</a>
      <div class="quiz-toolbar-title">
        <span class="quiz-toolbar-brand">Let's Plé</span>
        <h1>{{ i18n.t('quiz.title') }}</h1>
      </div>
      <details class="quiz-toolbar-menu" #menu (keydown.escape)="closeMenu()">
        <summary class="quiz-toolbar-trigger" [attr.aria-label]="i18n.t('quiz.menu')">⋮</summary>
        <div class="quiz-toolbar-dropdown">
          <a class="quiz-toolbar-action" routerLink="/quiz/statistiques" (click)="closeMenu()">{{
            i18n.t('quiz.stats.title')
          }}</a>
          <button type="button" class="quiz-toolbar-action" (click)="closeMenu(); replay.emit()">
            {{ i18n.t('quiz.newGame') }}
          </button>
          <button type="button" class="quiz-toolbar-action" (click)="openSettings()">
            {{ i18n.t('quiz.settings.title') }}
          </button>
        </div>
      </details>
    </header>
    <lp-dialog
      [open]="settingsOpen()"
      [title]="i18n.t('quiz.settings.title')"
      (dismissed)="settingsOpen.set(false)"
    >
      <div lpDialogBody>
        <p>{{ i18n.t('quiz.settings.hint') }}</p>
        <fieldset class="quiz-settings">
          <legend>{{ i18n.t('quiz.settings.categories') }}</legend>
          @for (type of types; track type) {
            <label class="quiz-settings-option">
              <input type="checkbox" [checked]="draft()[type]" (change)="toggle(type, $event)" />
              <span>{{ i18n.t('quiz.settings.' + type) }}</span>
            </label>
          }
        </fieldset>
        @if (!hasSelection()) {
          <p class="quiz-settings-error" role="alert">{{ i18n.t('quiz.settings.empty') }}</p>
        }
      </div>
      <div lpDialogActions>
        <lp-button variant="secondary" (click)="settingsOpen.set(false)">{{
          i18n.t('quiz.settings.cancel')
        }}</lp-button>
        <lp-button [disabled]="!hasSelection()" (click)="save()">{{
          i18n.t('quiz.settings.save')
        }}</lp-button>
      </div>
    </lp-dialog>
  `,
})
export class LpQuizToolbar {
  readonly preferences = input.required<QuizPreferences>();
  readonly settingsSaved = output<QuizPreferences>();
  readonly replay = output<void>();
  protected readonly i18n = inject(I18nService);
  protected readonly types = QUESTION_TYPES;
  protected readonly settingsOpen = signal(false);
  protected readonly draft = signal(normalizePreferences(null));
  protected readonly hasSelection = computed(() => enabledQuestionTypes(this.draft()).length > 0);
  private readonly menu = viewChild<ElementRef<HTMLDetailsElement>>('menu');

  openSettings(): void {
    this.closeMenu();
    this.draft.set(normalizePreferences(this.preferences()));
    this.settingsOpen.set(true);
  }
  protected closeMenu(): void {
    const menu = this.menu()?.nativeElement;
    if (!menu?.open) return;
    menu.open = false;
    menu.querySelector('summary')?.focus();
  }
  protected onDocumentClick(event: Event): void {
    if (event.target instanceof Node && !this.menu()?.nativeElement.contains(event.target)) {
      // Closing by a pointer outside must not steal focus from the clicked control.
      const menu = this.menu()?.nativeElement;
      if (menu) menu.open = false;
    }
  }
  protected toggle(type: QuestionType, event: Event): void {
    this.draft.update((value) => ({
      ...value,
      [type]: (event.target as HTMLInputElement).checked,
    }));
  }
  protected save(): void {
    if (!this.hasSelection()) return;
    this.settingsOpen.set(false);
    this.settingsSaved.emit(this.draft());
  }
}
