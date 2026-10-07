import { Component, inject, ViewEncapsulation } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpWeeklyTrend } from './weekly-trend';
import { STATISTICS_PREVIEW } from '../statistics-preview';
import { resolveStatsLabels } from '../stats-labels';
@Component({
  selector: 'lp-weekly-trend-showcase',
  imports: [LpWeeklyTrend],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-weekly-trend
    [weeks]="weeks"
    [timeZone]="'Europe/Paris'"
    [labels]="preview.labels"
  />`,
})
export class LpWeeklyTrendShowcase {
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
export const LPWEEKLYTREND_SHOWCASE: ComponentShowcase<LpWeeklyTrendShowcase> = {
  component: LpWeeklyTrendShowcase,
  controls: {},
};
