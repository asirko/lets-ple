import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LpButtonVariant = 'primary' | 'secondary' | 'danger';
export type LpButtonType = 'button' | 'submit';

@Component({
  selector: 'lp-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="lp-button"
      [class.lp-button--primary]="variant() === 'primary'"
      [class.lp-button--secondary]="variant() === 'secondary'"
      [class.lp-button--danger]="variant() === 'danger'"
      [type]="type()"
      [disabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './lp-button.scss',
})
export class LpButton {
  readonly variant = input<LpButtonVariant>('primary');
  readonly type = input<LpButtonType>('button');
  readonly disabled = input(false);
}
