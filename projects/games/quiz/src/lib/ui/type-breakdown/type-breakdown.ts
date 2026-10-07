import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { HISTORY_CONTINENTS, HISTORY_MODES } from '../../domain/knowledge-stats/events';
import type { Metrics } from '../../domain/knowledge-stats/statistics';
import {
  score,
  rate,
  type StatsLabels,
  type CountryRow,
  type BreakdownRow,
} from '../statistics-models';
@Component({
  selector: 'lp-type-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section>
    <h2>{{ title() }}</h2>
    <div class="quiz-stats-breakdown">
      @for (row of rows(); track row.key) {
        <div>
          <h3>{{ row.label }}</h3>
          <p>
            {{ row.metrics.count }} {{ labels()['answers'] }} ·
            {{ rate(row.metrics.successRate, labels()['na']) }} ·
            {{ score(row.metrics.averageScore, labels()['na']) }} {{ labels()['points'] }}
          </p>
        </div>
      }
    </div>
  </section>`,
})
export class LpTypeBreakdown {
  readonly labels = input.required<StatsLabels>();
  readonly score = score;
  readonly rate = rate;
  readonly title = input.required<string>();
  readonly rows = input.required<readonly BreakdownRow[]>();
}
