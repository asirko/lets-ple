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
  selector: 'lp-country-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section>
    <h2>{{ labels()['countries'] }}</h2>
    <div class="quiz-stats-filters">
      <label
        >{{ labels()['search']
        }}<input
          type="search"
          [value]="search()"
          (input)="search.set($any($event.target).value)" /></label
      ><label
        >{{ labels()['sort']
        }}<select (change)="sort.set($any($event.target).value)">
          <option value="name">{{ labels()['sortName'] }}</option>
          <option value="score">{{ labels()['sortScore'] }}</option>
        </select></label
      >
    </div>
    <ul class="quiz-stats-countries">
      @for (row of filtered(); track row.iso3) {
        <li [class.is-selected]="selected() === row.iso3">
          <button
            class="quiz-stats-country"
            type="button"
            (click)="selectedCountry.emit(row.iso3)"
            [attr.aria-pressed]="selected() === row.iso3"
          >
            <span class="quiz-stats-swatch" [attr.data-level]="row.level" aria-hidden="true"></span
            ><strong>{{ row.name }}</strong
            ><span>{{ labels()['level.' + row.level] }}</span
            ><span
              >{{ row.metrics.count }} {{ labels()['answers'] }} ·
              {{ score(row.metrics.averageScore, labels()['na']) }} {{ labels()['points'] }} ·
              {{ rate(row.metrics.successRate, labels()['na']) }}</span
            >
          </button>
        </li>
      } @empty {
        <li>{{ labels()['noMatch'] }}</li>
      }
    </ul>
  </section>`,
})
export class LpCountryList {
  readonly labels = input.required<StatsLabels>();
  readonly score = score;
  readonly rate = rate;
  readonly rows = input.required<readonly CountryRow[]>();
  readonly selected = input<string | null>(null);
  readonly selectedCountry = output<string>();
  readonly search = signal('');
  readonly sort = signal('name');
  readonly filtered = computed(() => {
    const query = this.search().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
    return this.rows()
      .filter((r) =>
        r.name.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr').includes(query),
      )
      .slice()
      .sort((a, b) =>
        this.sort() === 'score'
          ? (b.metrics.averageScore ?? -1) - (a.metrics.averageScore ?? -1) ||
            a.name.localeCompare(b.name, 'fr')
          : a.name.localeCompare(b.name, 'fr'),
      );
  });
}
