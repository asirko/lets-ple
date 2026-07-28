import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Cell } from '../../domain/types';

/**
 * Une case du plateau. Cinq états visuels : fixe, vide, jouable (indice), sélectionnée, remplie.
 * Une case fixe ou déjà remplie est inerte au clic — seule une case vide peut être sélectionnée.
 */
@Component({
  selector: 'lp-cryptogram-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cell().kind === 'fixed') {
      <span class="crypto-cell crypto-cell-fixed" aria-hidden="true">{{ char() }}</span>
    } @else {
      <button
        type="button"
        class="crypto-cell crypto-cell-button"
        [class.crypto-cell-filled]="isFilled()"
        [class.crypto-cell-playable]="playable() && !isFilled()"
        [class.crypto-cell-selected]="selected()"
        [disabled]="isFilled()"
        [attr.aria-pressed]="selected()"
        [attr.aria-label]="ariaLabel()"
        (click)="select.emit()"
      >
        <span class="crypto-cell-code">{{ code() }}</span>
        @if (isFilled()) {
          <span class="crypto-cell-letter">{{ char() }}</span>
        }
      </button>
    }
  `,
})
export class LpCryptogramCell {
  readonly cell = input.required<Cell>();
  readonly selected = input(false);
  /** Indice visuel : la carte du dessus de la main correspond à cette case sans risque connu. */
  readonly playable = input(false);
  readonly select = output<void>();

  protected code(): number | null {
    const cell = this.cell();
    return cell.kind === 'letter' ? cell.code : null;
  }

  protected char(): string {
    const cell = this.cell();
    if (cell.kind === 'fixed') return cell.char === ' ' ? '' : cell.char;
    return cell.filled !== null ? cell.char : '';
  }

  protected isFilled(): boolean {
    const cell = this.cell();
    return cell.kind === 'letter' && cell.filled !== null;
  }

  protected ariaLabel(): string {
    const cell = this.cell();
    if (cell.kind !== 'letter') return '';
    return cell.filled !== null ? `case ${cell.code}, lettre ${cell.char}` : `case ${cell.code}, vide`;
  }
}
