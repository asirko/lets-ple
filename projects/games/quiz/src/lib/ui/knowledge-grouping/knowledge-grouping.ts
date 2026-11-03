import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { KNOWLEDGE_GROUPINGS, type KnowledgeGrouping } from '../../domain/knowledge-stats/grouping';
import type { StatsLabels } from '../statistics-models';
/** Segmented choice of the scale at which the knowledge globe pools answers. */
@Component({
  selector: 'lp-knowledge-grouping',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fieldset class="quiz-stats-grouping">
    <legend>{{ labels()['grouping'] }}</legend>
    @for (g of groupings; track g) {
      <label
        ><input
          type="radio"
          name="quiz-stats-grouping"
          [value]="g"
          [checked]="g === grouping()"
          (change)="groupingChanged.emit(g)"
        /><span>{{ labels()['grouping.' + g] }}</span></label
      >
    }
  </fieldset>`,
})
export class LpKnowledgeGrouping {
  readonly labels = input.required<StatsLabels>();
  readonly grouping = input<KnowledgeGrouping>('continent');
  readonly groupingChanged = output<KnowledgeGrouping>();
  protected readonly groupings = KNOWLEDGE_GROUPINGS;
}
