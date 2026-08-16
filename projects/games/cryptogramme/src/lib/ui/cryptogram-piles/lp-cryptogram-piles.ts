import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Sym } from '../../domain/types';

/**
 * Les 5 piles de la main. Chaque pile est une pile LIFO indépendante : seul son sommet est
 * jouable ; les cartes en dessous restent visibles (profondeur) mais inertes au clic. Une pile
 * vide n'est pas sélectionnable.
 */
@Component({
  selector: 'lp-cryptogram-piles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crypto-piles" [attr.aria-label]="'Main, ' + piles().length + ' piles'">
      @for (pile of piles(); track $index) {
        <button
          type="button"
          class="crypto-pile"
          [class.crypto-pile-selected]="selectedPile() === $index"
          [disabled]="pile.length === 0"
          [attr.aria-pressed]="selectedPile() === $index"
          [attr.aria-label]="pileAriaLabel(pile, $index)"
          (click)="pileSelect.emit($index)"
        >
          @if (pile.length > 0) {
            <span class="crypto-pile-card">{{ pile[pile.length - 1] }}</span>
            @if (pile.length > 1) {
              <span class="crypto-pile-depth">{{ pile.length }}</span>
            }
          } @else {
            <span class="crypto-pile-empty" aria-hidden="true">—</span>
          }
        </button>
      }
    </div>
  `,
})
export class LpCryptogramPiles {
  readonly piles = input.required<readonly (readonly Sym[])[]>();
  readonly selectedPile = input<number | null>(null);
  readonly pileSelect = output<number>();

  protected pileAriaLabel(pile: readonly Sym[], index: number): string {
    if (pile.length === 0) return `Pile ${index + 1}, vide`;
    const sommet = pile[pile.length - 1];
    return `Pile ${index + 1}, carte ${sommet}, jouable`;
  }
}
