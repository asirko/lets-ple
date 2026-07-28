import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Sym } from '../../domain/types';

/**
 * La main : pile LIFO plafonnée. Seule la carte du dessus (le dernier élément) est jouable ; les
 * autres sont visuellement empilées derrière, inertes au clic.
 */
@Component({
  selector: 'lp-cryptogram-hand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crypto-hand" [attr.aria-label]="'Main, ' + hand().length + ' carte(s)'">
      @if (hand().length === 0) {
        <p class="crypto-hand-empty">Main vide</p>
      }
      @for (card of hand(); track $index; let last = $last) {
        <button
          type="button"
          class="crypto-hand-card"
          [class.crypto-hand-card-top]="last"
          [disabled]="!last"
          [attr.aria-label]="'Carte ' + card + (last ? ', jouable' : '')"
          (click)="playTop.emit()"
        >
          {{ card }}
        </button>
      }
    </div>
  `,
})
export class LpCryptogramHand {
  readonly hand = input.required<readonly Sym[]>();
  readonly playTop = output<void>();
}
