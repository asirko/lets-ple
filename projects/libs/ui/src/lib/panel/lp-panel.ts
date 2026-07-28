import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LpPanelPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'lp-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="lp-panel"
      [class.lp-panel--elevated]="elevated()"
      [class.lp-panel--padding-none]="padding() === 'none'"
      [class.lp-panel--padding-sm]="padding() === 'sm'"
      [class.lp-panel--padding-md]="padding() === 'md'"
      [class.lp-panel--padding-lg]="padding() === 'lg'"
    >
      <ng-content />
    </section>
  `,
  styleUrl: './lp-panel.scss',
})
export class LpPanel {
  readonly elevated = input(false);
  readonly padding = input<LpPanelPadding>('md');
}
