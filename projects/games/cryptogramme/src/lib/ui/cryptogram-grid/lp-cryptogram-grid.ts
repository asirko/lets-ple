import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LpCryptogramCell } from '../cryptogram-cell/lp-cryptogram-cell';
import type { Cell } from '../../domain/types';

interface IndexedCell {
  readonly cell: Cell;
  readonly index: number;
}

/**
 * Le plateau. Les cases sont groupées par mot (coupure sur chaque espace) pour que le retour à
 * la ligne — géré en CSS par `.crypto-grid` — ne coupe jamais un mot en deux.
 */
@Component({
  selector: 'lp-cryptogram-grid',
  imports: [LpCryptogramCell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crypto-grid">
      @for (word of words(); track $index) {
        <div class="crypto-word">
          @for (item of word; track item.index) {
            <lp-cryptogram-cell
              [cell]="item.cell"
              [selected]="selectedCell() === item.index"
              [playable]="playableCells()[item.index] ?? false"
              (select)="cellSelect.emit(item.index)"
            />
          }
        </div>
      }
    </div>
  `,
})
export class LpCryptogramGrid {
  readonly board = input.required<readonly Cell[]>();
  readonly selectedCell = input<number | null>(null);
  readonly playableCells = input<readonly boolean[]>([]);
  readonly cellSelect = output<number>();

  protected readonly words = computed<IndexedCell[][]>(() => {
    const words: IndexedCell[][] = [];
    let current: IndexedCell[] = [];

    this.board().forEach((cell, index) => {
      if (cell.kind === 'fixed' && cell.char === ' ') {
        if (current.length > 0) words.push(current);
        words.push([{ cell, index }]);
        current = [];
        return;
      }
      current.push({ cell, index });
    });

    if (current.length > 0) words.push(current);
    return words;
  });
}
