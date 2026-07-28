import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LpPanelPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'lp-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="panel"
      [class.panel-elevated]="elevated()"
      [class.panel-padding-none]="padding() === 'none'"
      [class.panel-padding-sm]="padding() === 'sm'"
      [class.panel-padding-md]="padding() === 'md'"
      [class.panel-padding-lg]="padding() === 'lg'"
    >
      <ng-content />
    </section>
  `,
})
export class LpPanel {
  readonly elevated = input(false);
  readonly padding = input<LpPanelPadding>('md');
}
