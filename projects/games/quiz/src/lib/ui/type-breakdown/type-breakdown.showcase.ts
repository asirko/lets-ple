import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { resolveStatsLabels } from '../stats-labels';
import { Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpTypeBreakdown } from './type-breakdown';
import { STATISTICS_PREVIEW } from '../statistics-preview';
@Component({
  selector: 'lp-type-breakdown-showcase',
  imports: [LpTypeBreakdown],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-type-breakdown
    [title]="preview.labels['types']"
    [rows]="preview.types"
    [labels]="preview.labels"
  />`,
})
export class LpTypeBreakdownShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly state = input('temporary');
}
export const LPTYPEBREAKDOWN_SHOWCASE: ComponentShowcase<LpTypeBreakdownShowcase> = {
  component: LpTypeBreakdownShowcase,
  controls: {},
};
