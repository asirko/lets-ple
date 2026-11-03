import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LpLogo } from '../logo/lp-logo';

export type LpLoaderSize = 'sm' | 'md';

/** État de chargement : la pastille du logo qui pulse, au-dessus d'un libellé annoncé comme statut. */
@Component({
  selector: 'lp-loader',
  imports: [LpLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loader" [class]="sizeClass()" role="status">
      <lp-logo class="loader-mark" variant="mark" [size]="size()" aria-hidden="true" />
      <p class="loader-label">{{ label() }}</p>
    </div>
  `,
})
export class LpLoader {
  readonly label = input.required<string>();
  readonly size = input<LpLoaderSize>('md');
  protected readonly sizeClass = computed(() => `loader-${this.size()}`);
}
