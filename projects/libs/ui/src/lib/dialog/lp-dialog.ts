import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

const TABBABLE_CANDIDATE_SELECTOR = [
  'button',
  '[href]',
  'input',
  'select',
  'textarea',
  'details > summary:first-of-type',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

let nextDialogId = 0;

@Component({
  selector: 'lp-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
  template: `
    <dialog
      #dialogElement
      class="m-dialog"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      (cancel)="onCancel($event)"
      (close)="onClose()"
    >
      <div class="dialog-backdrop" aria-hidden="true"></div>
      <section class="dialog-surface">
        <h2 class="dialog-title" [id]="titleId">{{ title() }}</h2>
        <div class="dialog-body">
          <ng-content select="[lpDialogBody]" />
        </div>
        <div class="dialog-actions">
          <ng-content select="[lpDialogActions]" />
        </div>
      </section>
    </dialog>
  `,
})
export class LpDialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closeOnEscape = input(true);
  readonly dismissed = output<void>();

  protected readonly titleId = `lp-dialog-title-${++nextDialogId}`;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialogElement');
  private previouslyFocused: HTMLElement | null = null;
  private closingFromInput = false;

  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (this.open() && element && !element.open) {
        this.previouslyFocused =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        element.showModal();
        this.focusPrimaryAction(element);
      }
      if (!this.open() && element?.open) {
        this.closingFromInput = true;
        element.close();
      }
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    if (this.closeOnEscape()) this.dismissed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const element = this.dialog()?.nativeElement;
    if (!element) return;
    const focusable = this.tabbableElements(element);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected onClose(): void {
    const closedIndependently = this.open() && !this.closingFromInput;
    this.closingFromInput = false;
    this.restoreFocus();
    if (closedIndependently) this.dismissed.emit();
  }

  protected restoreFocus(): void {
    if (this.previouslyFocused?.isConnected) this.previouslyFocused.focus();
    this.previouslyFocused = null;
  }

  private focusPrimaryAction(element: HTMLDialogElement): void {
    const tabbable = this.tabbableElements(element);
    const actionRegion = element.querySelector<HTMLElement>('.dialog-actions');
    const primary = tabbable.find(
      (candidate) =>
        actionRegion?.contains(candidate) && candidate.matches('[autofocus], .b-primary'),
    );
    const firstAction = tabbable.find((candidate) => actionRegion?.contains(candidate));
    (primary ?? firstAction ?? tabbable[0] ?? element).focus();
  }

  private tabbableElements(element: HTMLDialogElement): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>(TABBABLE_CANDIDATE_SELECTOR)).filter(
      (candidate) => this.isTabbable(candidate, element),
    );
  }

  private isTabbable(candidate: HTMLElement, boundary: HTMLDialogElement): boolean {
    if (candidate.matches(':disabled') || candidate.tabIndex < 0) return false;
    if (candidate instanceof HTMLInputElement && candidate.type === 'hidden') return false;
    if (candidate.closest('[hidden], [inert]')) return false;

    const closedDetails = candidate.closest('details:not([open])');
    if (closedDetails && candidate !== closedDetails.querySelector('summary')) return false;

    for (let current: HTMLElement | null = candidate; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        style.contentVisibility === 'hidden'
      ) {
        return false;
      }
      if (current === boundary) break;
    }
    return true;
  }
}
