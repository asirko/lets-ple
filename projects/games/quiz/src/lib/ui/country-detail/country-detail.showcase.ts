import { Component, inject, ViewEncapsulation } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpCountryDetail } from './country-detail';
import { STATISTICS_PREVIEW } from '../statistics-preview';
import { resolveStatsLabels } from '../stats-labels';
@Component({
  selector: 'lp-country-detail-showcase',
  imports: [LpCountryDetail],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-country-detail
    [country]="preview.rows[0]"
    [types]="preview.types"
    [modes]="preview.types"
    [labels]="preview.labels"
  />`,
})
export class LpCountryDetailShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly weeks = [
    { label: '14/09', current: false, metrics: STATISTICS_PREVIEW.metrics },
    {
      label: '21/09',
      current: false,
      metrics: { count: 0, averageScore: null, successRate: null },
    },
    { label: '28/09', current: false, metrics: STATISTICS_PREVIEW.metrics },
    { label: '05/10', current: true, metrics: STATISTICS_PREVIEW.metrics },
  ];
  readonly levels = new Map(this.preview.rows.map((r) => [r.iso3, r.level]));
}
export const LPCOUNTRYDETAIL_SHOWCASE: ComponentShowcase<LpCountryDetailShowcase> = {
  component: LpCountryDetailShowcase,
  controls: {},
};
