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
  selector: 'lp-history-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (kind() !== 'durable' || invalid()) {
    <aside class="quiz-stats-notice" role="status">
      <p>
        {{ labels()['status.' + kind()] }}
        @if (pending()) {
          <span>{{ pending() }} {{ labels()['pendingAnswers'] }}</span>
        }
      </p>
      @if (invalid()) {
        <p>{{ invalid() }} {{ labels()['invalidAnswers'] }}</p>
      }
      @if (kind() !== 'pending') {
        <button class="b-button" type="button" (click)="retry.emit()">
          {{ labels()['retry'] }}
        </button>
      }
    </aside>
  }`,
})
export class LpHistoryStatus {
  readonly labels = input.required<StatsLabels>();
  readonly score = score;
  readonly rate = rate;
  readonly kind = input.required<string>();
  readonly pending = input(0);
  readonly invalid = input(0);
  readonly retry = output<void>();
}
