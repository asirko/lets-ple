import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  DestroyRef,
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
    <form
      class="quiz-cash"
      [class.is-editing]="query().trim().length > 0"
      (submit)="submit($event)"
    >
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
        (blur)="blur()"
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
        #list
        class="quiz-suggestions"
        [style.left.px]="placement().left"
        [style.top.px]="placement().top"
        [style.width.px]="placement().width"
        [style.max-height.px]="placement().height"
        (pointerdown)="pointerdown($event)"
        (mousedown)="$event.preventDefault()"
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
            (pointerup)="pointerup($event, answer)"
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
  protected readonly placement = signal({ left: 0, top: 0, width: 0, height: 0 });
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private touchingList = false;
  private touchStart = { x: 0, y: 0 };
  private frame = 0;
  private releaseTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly options = viewChildren<ElementRef<HTMLElement>>('option');

  constructor() {
    effect(() => this.field()?.nativeElement.focus());
    afterRenderEffect(() => {
      if (!this.expanded()) return;
      this.positionList();
    });
    afterRenderEffect(() => {
      this.query();
      this.expanded();
      const list = this.list()?.nativeElement;
      if (list) list.scrollTop = 0;
    });
    afterRenderEffect(() => {
      this.placement();
      if (!this.expanded()) return;
      const list = this.list()?.nativeElement;
      const option = this.options()[this.active()]?.nativeElement;
      if (!list || !option) return;
      // Scroll only the list, never the page or the field above the keyboard.
      const item = option.getBoundingClientRect();
      const box = list.getBoundingClientRect();
      if (item.top < box.top + list.clientTop)
        list.scrollTop -= box.top + list.clientTop - item.top;
      else if (item.bottom > box.top + list.clientTop + list.clientHeight)
        list.scrollTop += item.bottom - (box.top + list.clientTop + list.clientHeight);
    });
    const reposition = (event: Event) => {
      if (event.target === this.list()?.nativeElement) return;
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => {
        if (this.expanded()) this.positionList();
      });
    };
    const release = () => {
      if (!this.touchingList) return;
      clearTimeout(this.releaseTimer);
      this.releaseTimer = setTimeout(() => {
        this.touchingList = false;
        if (document.activeElement !== this.field()?.nativeElement) this.blur();
      }, 0);
    };
    const cancel = () => {
      if (!this.touchingList) return;
      this.touchingList = false;
      this.field()?.nativeElement.focus({ preventScroll: true });
    };
    const viewport = window.visualViewport;
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    viewport?.addEventListener('resize', reposition);
    viewport?.addEventListener('scroll', reposition);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', cancel);
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
      clearTimeout(this.releaseTimer);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      viewport?.removeEventListener('resize', reposition);
      viewport?.removeEventListener('scroll', reposition);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', cancel);
    });
  }

  private positionList(): void {
    const field = this.field()?.nativeElement;
    if (!field) return;
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const left = viewport?.offsetLeft ?? 0;
    const height = viewport?.height ?? window.innerHeight;
    const width = viewport?.width ?? window.innerWidth;
    const margin = 8;
    let box = field.getBoundingClientRect();
    // Leave room above the field even when focus/zoom places it at the top.
    const desiredTop = top + Math.min(160, Math.max(0, height - box.height - margin * 2));
    if (box.top < top + Math.min(96, height / 3) || box.bottom > top + height - margin) {
      window.scrollBy({ top: box.top - desiredTop, behavior: 'instant' });
      box = field.getBoundingClientRect();
    }
    const bottom = Math.max(top + margin, Math.min(box.top - margin, top + height - margin));
    const listLeft = Math.max(left + margin, Math.min(box.left, left + width - margin * 2));
    this.placement.set({
      left: listLeft,
      top: bottom,
      width: Math.max(0, Math.min(box.width, left + width - margin - listLeft)),
      height: Math.max(0, bottom - top - margin),
    });
  }

  protected pointerdown(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.touchingList = true;
      this.touchStart = { x: event.clientX, y: event.clientY };
    } else {
      event.preventDefault();
    }
  }

  protected pointerup(event: PointerEvent, answer: Answer): void {
    if (!this.touchingList) return;
    if (
      Math.hypot(
        (event.clientX ?? 0) - this.touchStart.x,
        (event.clientY ?? 0) - this.touchStart.y,
      ) > 10
    )
      return;
    this.touchingList = false;
    this.select(answer);
  }

  protected blur(): void {
    if (this.touchingList) return;
    this.open.set(false);
    this.active.set(-1);
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
    this.field()?.nativeElement.focus({ preventScroll: true });
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
