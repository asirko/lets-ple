import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** La pioche : nombre de cartes restantes, désactivée si la pioche est vide ou la main pleine. */
@Component({
  selector: 'lp-cryptogram-deck',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="crypto-deck"
      [disabled]="remaining() === 0 || handFull()"
      [attr.aria-label]="'Piocher, ' + remaining() + ' carte(s) restante(s)'"
      (click)="draw.emit()"
    >
      <span class="crypto-deck-count">{{ remaining() }}</span>
    </button>
  `,
})
export class LpCryptogramDeck {
  readonly remaining = input.required<number>();
  readonly handFull = input(false);
  readonly draw = output<void>();
}
