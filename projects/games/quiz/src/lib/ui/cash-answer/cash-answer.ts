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
      #form
      class="quiz-cash"
      [class.is-docked]="docked()"
      [class.is-compact]="compact()"
      (submit)="submit($event)"
    >
      <label [for]="id">{{ i18n.t('quiz.cash.' + answerType()) }}</label>
      <p class="quiz-hint" [id]="id + '-help'">{{ i18n.t('quiz.cash.help') }}</p>
      <div class="quiz-cash-anchor" [style.height.px]="docked() ? reservedHeight() : null">
        <div
          #entry
          class="quiz-cash-entry"
          [style.left.px]="docked() ? dock().left : null"
          [style.top.px]="docked() ? dock().top : null"
          [style.width.px]="docked() ? dock().width : null"
          [style.max-height.px]="docked() ? dock().maxHeight : null"
          (focusout)="entryBlur($event)"
        >
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
            (focus)="focus()"
            (blur)="blur($event)"
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
          <lp-button
            type="submit"
            [disabled]="!acceptedAnswer()"
            (mousedown)="$event.preventDefault()"
            >{{ i18n.t('quiz.validate') }}</lp-button
          >
        </div>
      </div>
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
  protected readonly focused = signal(false);
  protected readonly docked = signal(false);
  protected readonly compact = signal(false);
  protected readonly reservedHeight = signal(0);
  protected readonly dock = signal({ left: 0, top: 0, width: 0, maxHeight: 0 });
  protected readonly acceptedAnswer = computed(() =>
    this.domain().find((answer) => matchesAnswer(answer, this.query())),
  );
  private readonly form = viewChild<ElementRef<HTMLElement>>('form');
  private readonly entry = viewChild<ElementRef<HTMLElement>>('entry');
  private unlockPage: (() => void) | undefined;
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
  private optionFrame = 0;
  private releaseTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly options = viewChildren<ElementRef<HTMLElement>>('option');

  constructor() {
    effect(() => this.field()?.nativeElement.focus());
    afterRenderEffect(() => {
      if (!this.focused()) return;
      this.dock();
      this.compact();
      this.open();
      this.query();
      this.invalid();
      this.positionControls();
    });
    afterRenderEffect(() => {
      this.query();
      this.expanded();
      const list = this.list()?.nativeElement;
      if (list) list.scrollTop = 0;
    });
    afterRenderEffect(() => {
      this.placement();
      const option = this.options()[this.active()]?.nativeElement;
      cancelAnimationFrame(this.optionFrame);
      if (!this.expanded() || !option) return;
      // Measure after the dock and popup styles have reached the DOM.
      this.optionFrame = requestAnimationFrame(() => this.revealOption(option));
    });
    const reposition = (event: Event) => {
      if (event.target === this.list()?.nativeElement) return;
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => {
        if (this.focused()) this.positionControls();
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
    const preventPageGesture = (event: Event) => {
      if (!this.focused() || this.entry()?.nativeElement.contains(event.target as Node)) return;
      if ('touches' in event && (event as TouchEvent).touches.length > 1) return;
      if (event instanceof WheelEvent && event.ctrlKey) return;
      event.preventDefault();
    };
    window.addEventListener('touchmove', preventPageGesture, { passive: false });
    window.addEventListener('wheel', preventPageGesture, { passive: false });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', cancel);
    inject(DestroyRef).onDestroy(() => {
      this.unlockPage?.();
      window.removeEventListener('touchmove', preventPageGesture);
      window.removeEventListener('wheel', preventPageGesture);
      cancelAnimationFrame(this.frame);
      cancelAnimationFrame(this.optionFrame);
      clearTimeout(this.releaseTimer);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      viewport?.removeEventListener('resize', reposition);
      viewport?.removeEventListener('scroll', reposition);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', cancel);
    });
  }

  private revealOption(option: HTMLElement): void {
    const list = this.list()?.nativeElement;
    if (!list) return;
    const item = option.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    const top = box.top + list.clientTop;
    const bottom = top + list.clientHeight;
    if (item.top < top || item.height > list.clientHeight) list.scrollTop += item.top - top;
    else if (item.bottom > bottom) list.scrollTop += item.bottom - bottom;
  }

  private positionControls(): void {
    const field = this.field()?.nativeElement;
    const entry = this.entry()?.nativeElement;
    if (!field || !entry) return;
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const left = viewport?.offsetLeft ?? 0;
    const height = viewport?.height ?? window.innerHeight;
    const width = viewport?.width ?? window.innerWidth;
    this.compact.set(height < 240);
    const margin = this.compact() ? 4 : 8;
    this.docked.set(width <= 768);
    if (this.docked()) {
      const anchor = this.form()?.nativeElement.getBoundingClientRect();
      const dockWidth = Math.max(0, Math.min(anchor?.width || width, width - margin * 2));
      const dockLeft = Math.max(
        left + margin,
        Math.min(anchor?.left ?? left, left + width - margin - dockWidth),
      );
      const maxHeight = Math.max(0, height - margin * 2);
      const entryHeight = Math.min(entry.scrollHeight + 2, maxHeight);
      const next = {
        left: dockLeft,
        top: top + height - margin - entryHeight,
        width: dockWidth,
        maxHeight,
      };
      const previous = this.dock();
      if (
        Object.keys(next).some(
          (key) => next[key as keyof typeof next] !== previous[key as keyof typeof next],
        )
      )
        this.dock.set(next);
    }
    const box = field.getBoundingClientRect();
    const bottom = Math.max(top + margin, Math.min(box.top - margin, top + height - margin));
    const listLeft = Math.max(left + margin, Math.min(box.left, left + width - margin * 2));
    this.placement.set({
      left: listLeft,
      top: bottom,
      width: Math.max(0, Math.min(box.width, left + width - margin - listLeft)),
      height: Math.max(0, bottom - top - margin),
    });
  }

  protected focus(): void {
    if (!this.focused()) {
      this.reservedHeight.set(this.entry()?.nativeElement.getBoundingClientRect().height ?? 0);
      this.lockPage();
      this.focused.set(true);
    }
    this.open.set(true);
  }

  private lockPage(): void {
    const x = window.scrollX;
    const y = window.scrollY;
    const overrides: [CSSStyleDeclaration, string, string][] = [
      [document.documentElement.style, 'overflow', 'hidden'],
      [document.body.style, 'position', 'fixed'],
      [document.body.style, 'top', '-' + y + 'px'],
      [document.body.style, 'left', '-' + x + 'px'],
      [document.body.style, 'width', '100%'],
    ];
    const previous = overrides.map(([style, name]) => ({
      style,
      name,
      value: style.getPropertyValue(name),
      priority: style.getPropertyPriority(name),
    }));
    for (const [style, name, value] of overrides) style.setProperty(name, value);
    this.unlockPage = () => {
      for (const { style, name, value, priority } of previous) {
        if (value) style.setProperty(name, value, priority);
        else style.removeProperty(name);
      }
      window.scrollTo(x, y);
      this.unlockPage = undefined;
    };
  }

  protected entryBlur(event: FocusEvent): void {
    if (!this.entry()?.nativeElement.contains(event.relatedTarget as Node | null)) this.blur(event);
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

  protected blur(event?: FocusEvent): void {
    if (this.touchingList) return;
    this.open.set(false);
    this.active.set(-1);
    if (event?.relatedTarget && this.entry()?.nativeElement.contains(event.relatedTarget as Node))
      return;
    this.focused.set(false);
    this.docked.set(false);
    this.unlockPage?.();
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
    const answer = this.acceptedAnswer();
    if (!answer) {
      this.invalid.set(true);
      return;
    }
    this.answered.emit(answer.label);
  }
}
