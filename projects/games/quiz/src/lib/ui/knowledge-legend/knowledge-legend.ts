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
  selector: 'lp-knowledge-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="quiz-stats-legend">
    <h2>{{ labels()['legend'] }}</h2>
    <ul>
      @for (level of levels; track level) {
        <li>
          <span class="quiz-stats-swatch" [attr.data-level]="level" aria-hidden="true"></span
          >{{ labels()['level.' + level] }}
        </li>
      }
    </ul>
    <p>{{ labels()['levelExplanation'] }}</p>
    <p>{{ labels()['modeExplanation'] }}</p>
  </section>`,
})
export class LpKnowledgeLegend {
  readonly labels = input.required<StatsLabels>();
  readonly score = score;
  readonly rate = rate;
  readonly levels = ['none', 'insufficient', 'low', 'medium', 'high'];
}
