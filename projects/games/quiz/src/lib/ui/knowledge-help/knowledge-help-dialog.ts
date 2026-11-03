import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LpDialog } from '@lets-ple/ui';
import { LpKnowledgeLegend } from '../knowledge-legend/knowledge-legend';
import type { StatsLabels } from '../statistics-models';
/** How to handle and read the knowledge globe, kept out of the way of the map itself. */
@Component({
  selector: 'lp-knowledge-help-dialog',
  imports: [LpDialog, LpKnowledgeLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<lp-dialog [open]="open()" [title]="labels()['legend']" (dismissed)="closed.emit()"
    ><div lpDialogBody class="quiz-stats-help">
      <p>{{ labels()['globeHint'] }}</p>
      <lp-knowledge-legend [labels]="labels()" />
      <p>{{ labels()['groupingExplanation'] }}</p>
      <p>{{ labels()['coverage'] }}</p>
    </div>
    <div lpDialogActions>
      <button autofocus class="b-button" type="button" (click)="closed.emit()">
        {{ labels()['close'] }}
      </button>
    </div></lp-dialog
  >`,
})
export class LpKnowledgeHelpDialog {
  readonly labels = input.required<StatsLabels>();
  readonly open = input(false);
  readonly closed = output<void>();
}
