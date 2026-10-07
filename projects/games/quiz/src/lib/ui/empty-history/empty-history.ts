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
  selector: 'lp-empty-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="quiz-stats-empty">
    <h2>{{ labels()['emptyTitle'] }}</h2>
    <p>{{ labels()['emptyHint'] }}</p>
    <p>{{ labels()['privacy'] }}</p>
    <button class="b-button b-primary" type="button" (click)="play.emit()">
      {{ labels()['play'] }}
    </button>
  </section>`,
})
export class LpEmptyHistory {
  readonly labels = input.required<StatsLabels>();
  readonly score = score;
  readonly rate = rate;
  readonly play = output<void>();
}
