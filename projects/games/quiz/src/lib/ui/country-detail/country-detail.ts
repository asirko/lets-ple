import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LpStatisticsSummary } from '../statistics-summary/statistics-summary';
import { LpTypeBreakdown } from '../type-breakdown/type-breakdown';
import type { StatsLabels, CountryRow, BreakdownRow } from '../statistics-models';
@Component({
  selector: 'lp-country-detail',
  imports: [LpStatisticsSummary, LpTypeBreakdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="quiz-stats-detail">
    <h2 #heading tabindex="-1">{{ country().name }}</h2>
    <p>{{ labels()['level.' + country().level] }}</p>
    <lp-statistics-summary [metrics]="country().metrics" [labels]="labels()" /><lp-type-breakdown
      [title]="labels()['types']"
      [rows]="types()"
      [labels]="labels()"
    /><lp-type-breakdown [title]="labels()['modes']" [rows]="modes()" [labels]="labels()" /><button
      class="b-button"
      (click)="closed.emit()"
      type="button"
    >
      {{ labels()['closeDetail'] }}
    </button>
  </section>`,
})
export class LpCountryDetail {
  readonly country = input.required<CountryRow>();
  readonly labels = input.required<StatsLabels>();
  readonly types = input.required<readonly BreakdownRow[]>();
  readonly modes = input.required<readonly BreakdownRow[]>();
  readonly closed = output<void>();
  private heading = viewChild<ElementRef<HTMLElement>>('heading');
  constructor() {
    effect(() => {
      this.country();
      this.heading()?.nativeElement.focus();
    });
  }
}
