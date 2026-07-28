import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Sym } from '../../domain/types';

/** La table de correspondance nombre → symbole, révélée au fur et à mesure des cases résolues. */
@Component({
  selector: 'lp-cipher-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="crypto-cipher-table">
      <caption class="crypto-cipher-table-caption">Table de correspondance</caption>
      <tbody>
        <tr>
          @for (entry of entries(); track entry[0]) {
            <td class="crypto-cipher-table-cell">
              <span class="crypto-cipher-table-code">{{ entry[0] }}</span>
              <span class="crypto-cipher-table-symbol">{{ entry[1] }}</span>
            </td>
          }
        </tr>
      </tbody>
    </table>
  `,
})
export class LpCipherTable {
  readonly known = input.required<ReadonlyMap<number, Sym>>();

  protected readonly entries = computed(() =>
    [...this.known().entries()].sort(([a], [b]) => a - b),
  );
}
