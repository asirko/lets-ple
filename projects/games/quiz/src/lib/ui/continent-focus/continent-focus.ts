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
  selector: 'lp-continent-focus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="quiz-stats-filters">
    <label
      >{{ labels()['focus']
      }}<select
        [attr.aria-label]="labels()['focus']"
        [value]="continent() || ''"
        (change)="continentChanged.emit($any($event.target).value || null)"
      >
        <option value="">{{ labels()['world'] }}</option>
        @for (c of continents; track c) {
          <option [value]="c">{{ labels()['continent.' + c] }}</option>
        }
      </select></label
    ><label
      >{{ labels()['mode']
      }}<select
        [attr.aria-label]="labels()['mode']"
        [value]="mode() || ''"
        (change)="modeChanged.emit($any($event.target).value || null)"
      >
        <option value="">{{ labels()['allModes'] }}</option>
        @for (m of modes; track m) {
          <option [value]="m">{{ labels()['mode.' + m] }}</option>
        }
      </select></label
    >
  </div>`,
})
export class LpContinentFocus {
  readonly labels = input.required<StatsLabels>();
  readonly score = score;
  readonly rate = rate;
  readonly continent = input<string | null>(null);
  readonly mode = input<string | null>(null);
  readonly continentChanged = output<string | null>();
  readonly modeChanged = output<string | null>();
  readonly continents = HISTORY_CONTINENTS;
  readonly modes = Object.keys(HISTORY_MODES);
}
