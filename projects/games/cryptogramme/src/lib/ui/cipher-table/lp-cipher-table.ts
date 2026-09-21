import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Sym } from '../../domain/types';

/** La table de correspondance nombre → symbole, révélée au fur et à mesure des cases résolues. */
@Component({
  selector: 'lp-cipher-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="crypto-cipher-table" aria-label="Table de correspondance">
      @for (entry of entries(); track entry[0]) {
        <div class="crypto-cipher-table-cell">
          <dt class="crypto-cipher-table-code">{{ entry[0] }}</dt>
          <dd class="crypto-cipher-table-symbol">{{ entry[1] }}</dd>
        </div>
      }
    </dl>
  `,
})
export class LpCipherTable {
  readonly known = input.required<ReadonlyMap<number, Sym>>();

  protected readonly entries = computed(() =>
    [...this.known().entries()].sort(([a], [b]) => a - b),
  );
}
