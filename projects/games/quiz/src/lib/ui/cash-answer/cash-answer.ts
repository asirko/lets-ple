import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { LpButton } from '@lets-ple/ui';
import { matchesAnswer, searchAnswers } from '../../domain/catalog';
import type { Answer, AnswerType } from '../../domain/types';

let nextId = 0;
@Component({
  selector: 'lp-cash-answer',
  imports: [LpButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="quiz-cash" (submit)="submit($event)">
      <label [for]="id">{{ i18n.t('quiz.cash.' + answerType()) }}</label>
      <p class="quiz-hint" [id]="id + '-help'">{{ i18n.t('quiz.cash.help') }}</p>
      <input
        #field
        class="quiz-input"
        [id]="id"
        type="text"
        role="combobox"
        autocomplete="off"
        autocapitalize="words"
        [spellcheck]="false"
        [value]="query()"
        (input)="change($event)"
        (keydown)="keydown($event)"
        (focus)="open.set(true)"
        (blur)="open.set(false)"
        aria-autocomplete="list"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="id + '-list'"
        [attr.aria-activedescendant]="
          expanded() && active() >= 0 ? id + '-option-' + active() : null
        "
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="id + '-help' + (invalid() ? ' ' + id + '-error' : '')"
      />
      <ul
        class="quiz-suggestions"
        role="listbox"
        [id]="id + '-list'"
        [hidden]="!expanded()"
        [attr.aria-label]="i18n.t('quiz.cash.suggestions')"
      >
        @for (answer of suggestions(); track answer.id; let index = $index) {
          <li
            #option
            role="option"
            [id]="id + '-option-' + index"
            [attr.aria-selected]="active() === index"
            [class.is-selected]="active() === index"
            (pointerdown)="$event.preventDefault()"
            (click)="select(answer)"
          >
            {{ answer.label }}
          </li>
        }
      </ul>
      @if (open() && query().trim() && !suggestions().length) {
        <p class="quiz-hint" role="status">{{ i18n.t('quiz.cash.empty') }}</p>
      }
      @if (invalid()) {
        <p class="quiz-error" role="alert" [id]="id + '-error'">
          {{ i18n.t('quiz.cash.invalid.' + answerType()) }}
        </p>
      }
      <lp-button type="submit">{{ i18n.t('quiz.validate') }}</lp-button>
    </form>
  `,
})
export class LpCashAnswer {
  readonly domain = input.required<readonly Answer[]>();
  readonly answerType = input.required<AnswerType>();
  readonly answered = output<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly id = `quiz-cash-${nextId++}`;
  protected readonly query = signal('');
  protected readonly active = signal(-1);
  protected readonly open = signal(false);
  protected readonly invalid = signal(false);
  protected readonly suggestions = computed(() => searchAnswers(this.domain(), this.query()));
  protected readonly expanded = computed(() => this.open() && this.suggestions().length > 0);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly options = viewChildren<ElementRef<HTMLElement>>('option');

  constructor() {
    effect(() => this.field()?.nativeElement.focus());
    effect(() =>
      this.options()[this.active()]?.nativeElement.scrollIntoView?.({ block: 'nearest' }),
    );
  }
  protected change(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.active.set(-1);
    this.open.set(true);
    this.invalid.set(false);
  }
  protected select(answer: Answer): void {
    this.query.set(answer.label);
    this.open.set(false);
    this.active.set(-1);
    this.invalid.set(false);
    this.field()?.nativeElement.focus();
    this.open.set(false);
  }
  protected keydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      this.open.set(false);
      this.active.set(-1);
      return;
    }
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      this.open.set(true);
      const length = this.suggestions().length;
      if (length)
        this.active.set(
          this.active() < 0
            ? event.key === 'ArrowDown'
              ? 0
              : length - 1
            : (this.active() + (event.key === 'ArrowDown' ? 1 : -1) + length) % length,
        );
    } else if (event.key === 'Enter' && this.expanded() && this.active() >= 0) {
      event.preventDefault();
      this.select(this.suggestions()[this.active()]);
    }
  }
  protected submit(event: Event): void {
    event.preventDefault();
    const answer = this.domain().find((a) => matchesAnswer(a, this.query()));
    if (!answer) {
      this.invalid.set(true);
      return;
    }
    this.answered.emit(answer.label);
  }
}
