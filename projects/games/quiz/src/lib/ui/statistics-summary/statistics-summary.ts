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
  selector: 'lp-statistics-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dl class="quiz-stats-summary">
    <div>
      <dt>{{ labels()['answers'] }}</dt>
      <dd>{{ metrics().count }}</dd>
    </div>
    <div>
      <dt>{{ labels()['success'] }}</dt>
      <dd>{{ rate(metrics().successRate, labels()['na']) }}</dd>
    </div>
    <div>
      <dt>{{ labels()['score'] }}</dt>
      <dd>
        {{ score(metrics().averageScore, labels()['na']) }}
        <small>{{ labels()['perAnswer'] }}</small>
      </dd>
    </div>
  </dl>`,
})
export class LpStatisticsSummary {
  readonly labels = input.required<StatsLabels>();
  readonly score = score;
  readonly rate = rate;
  readonly metrics = input.required<Metrics>();
}
