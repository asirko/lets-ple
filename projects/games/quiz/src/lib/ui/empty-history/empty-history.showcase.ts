import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { resolveStatsLabels } from '../stats-labels';
import { Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpEmptyHistory } from './empty-history';
import { STATISTICS_PREVIEW } from '../statistics-preview';
@Component({
  selector: 'lp-empty-history-showcase',
  imports: [LpEmptyHistory],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-empty-history [labels]="preview.labels" />`,
})
export class LpEmptyHistoryShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly state = input('temporary');
}
export const LPEMPTYHISTORY_SHOWCASE: ComponentShowcase<LpEmptyHistoryShowcase> = {
  component: LpEmptyHistoryShowcase,
  controls: {},
};
