import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { resolveStatsLabels } from '../stats-labels';
import { Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpStatisticsSummary } from './statistics-summary';
import { STATISTICS_PREVIEW } from '../statistics-preview';
@Component({
  selector: 'lp-statistics-summary-showcase',
  imports: [LpStatisticsSummary],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-statistics-summary [metrics]="preview.metrics" [labels]="preview.labels" />`,
})
export class LpStatisticsSummaryShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly state = input('temporary');
}
export const LPSTATISTICSSUMMARY_SHOWCASE: ComponentShowcase<LpStatisticsSummaryShowcase> = {
  component: LpStatisticsSummaryShowcase,
  controls: {},
};
