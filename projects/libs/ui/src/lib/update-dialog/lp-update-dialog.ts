import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LpDialog } from '../dialog/lp-dialog';

export interface UpdateDialogLabels {
  title: string;
  recoveryTitle: string;
  message: string;
  hint: string;
  recoveryMessage: string;
  later: string;
  update: string;
  reload: string;
}

@Component({
  selector: 'lp-update-dialog',
  imports: [LpDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lp-dialog
      [open]="open()"
      [title]="recovery() ? labels().recoveryTitle : labels().title"
      (dismissed)="later.emit()"
    >
      <div lpDialogBody>
        @if (recovery()) {
          <p>{{ labels().recoveryMessage }}</p>
        } @else {
          <p>{{ labels().message }}</p>
          <p>{{ labels().hint }}</p>
        }
      </div>
      <ng-container lpDialogActions>
        <button class="b-button b-secondary" type="button" (click)="later.emit()">
          {{ labels().later }}
        </button>
        <button class="b-button b-primary" type="button" (click)="update.emit()">
          {{ recovery() ? labels().reload : labels().update }}
        </button>
      </ng-container>
    </lp-dialog>
  `,
})
export class LpUpdateDialog {
  readonly labels = input.required<UpdateDialogLabels>();
  readonly open = input(false);
  readonly recovery = input(false);
  readonly update = output<void>();
  readonly later = output<void>();
}
