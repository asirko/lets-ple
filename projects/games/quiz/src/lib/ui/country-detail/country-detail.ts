import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LpDialog } from '@lets-ple/ui';
import { LpStatisticsSummary } from '../statistics-summary/statistics-summary';
import { LpTypeBreakdown } from '../type-breakdown/type-breakdown';
import type { StatsLabels, CountryRow, BreakdownRow } from '../statistics-models';
@Component({
  selector: 'lp-country-detail',
  imports: [LpDialog, LpStatisticsSummary, LpTypeBreakdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<lp-dialog [open]="true" [title]="country().name" (dismissed)="closed.emit()">
    <div lpDialogBody class="quiz-stats-detail">
      <p>{{ labels()['level.' + country().level] }}</p>
      <lp-statistics-summary [metrics]="country().metrics" [labels]="labels()" />
      <lp-type-breakdown [title]="labels()['types']" [rows]="types()" [labels]="labels()" />
      <lp-type-breakdown [title]="labels()['modes']" [rows]="modes()" [labels]="labels()" />
    </div>
    <div lpDialogActions>
      <button autofocus class="b-button" (click)="closed.emit()" type="button">
        {{ labels()['closeDetail'] }}
      </button>
    </div>
  </lp-dialog>`,
})
export class LpCountryDetail {
  readonly country = input.required<CountryRow>();
  readonly labels = input.required<StatsLabels>();
  readonly types = input.required<readonly BreakdownRow[]>();
  readonly modes = input.required<readonly BreakdownRow[]>();
  readonly closed = output<void>();
}
