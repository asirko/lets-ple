import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LpDialog } from '@lets-ple/ui';
import type { StatsLabels } from '../statistics-models';
@Component({
  selector: 'lp-clear-history-dialog',
  imports: [LpDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<lp-dialog
    [open]="open()"
    [title]="labels()['clearTitle']"
    [closeOnEscape]="!busy()"
    (dismissed)="cancelled.emit()"
    ><div lpDialogBody>
      <p>{{ labels()['clearHint'] }}</p>
      @if (failed()) {
        <p role="alert">{{ labels()['clearError'] }}</p>
      }
    </div>
    <div lpDialogActions>
      <button
        autofocus
        class="b-button"
        type="button"
        [disabled]="busy()"
        (click)="cancelled.emit()"
      >
        {{ labels()['cancel'] }}</button
      ><button
        class="b-button b-danger"
        type="button"
        [disabled]="busy()"
        (click)="confirmed.emit()"
      >
        {{ busy() ? labels()['clearing'] : labels()['confirmClear'] }}
      </button>
    </div></lp-dialog
  >`,
})
export class LpClearHistoryDialog {
  readonly labels = input.required<StatsLabels>();
  readonly open = input(false);
  readonly busy = input(false);
  readonly failed = input(false);
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
}
