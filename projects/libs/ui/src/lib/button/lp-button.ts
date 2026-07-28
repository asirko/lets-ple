import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LpButtonVariant = 'primary' | 'secondary' | 'danger';
export type LpButtonType = 'button' | 'submit';

@Component({
  selector: 'lp-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="b-button"
      [class.b-primary]="variant() === 'primary'"
      [class.b-secondary]="variant() === 'secondary'"
      [class.b-danger]="variant() === 'danger'"
      [class.is-disabled]="disabled()"
      [type]="type()"
      [disabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
})
export class LpButton {
  readonly variant = input<LpButtonVariant>('primary');
  readonly type = input<LpButtonType>('button');
  readonly disabled = input(false);
}
