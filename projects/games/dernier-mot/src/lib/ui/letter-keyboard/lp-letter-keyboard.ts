import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';

const LETTERS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

@Component({
  selector: 'lp-letter-keyboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="dernier-mot-keyboard"
      role="group"
      [attr.aria-label]="text('dernierMot.keyboard.groupLabel')"
    >
      @for (letter of letters; track letter) {
        <button
          type="button"
          class="dernier-mot-key"
          [class.is-disabled]="disabled()"
          [disabled]="disabled()"
          [attr.data-letter]="letter"
          [attr.aria-label]="text('dernierMot.keyboard.letterLabel', { letter })"
          (click)="selectLetter(letter)"
        >
          {{ letter }}
        </button>
      }
    </div>
  `,
})
export class LpLetterKeyboard {
  readonly disabled = input(false);
  readonly letterSelected = output<string>();
  protected readonly letters = LETTERS;
  private readonly i18n = inject(I18nService);

  selectLetter(letter: string): void {
    if (!this.disabled() && /^[A-Z]$/.test(letter)) this.letterSelected.emit(letter);
  }

  protected text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
