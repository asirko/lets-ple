import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { resolveStatsLabels } from '../stats-labels';
import { Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpHistoryStatus } from './history-status';
import { STATISTICS_PREVIEW } from '../statistics-preview';
@Component({
  selector: 'lp-history-status-showcase',
  imports: [LpHistoryStatus],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-history-status [kind]="state()" [pending]="3" [labels]="preview.labels" />`,
})
export class LpHistoryStatusShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly state = input('temporary');
}
export const LPHISTORYSTATUS_SHOWCASE: ComponentShowcase<LpHistoryStatusShowcase> = {
  component: LpHistoryStatusShowcase,
  controls: {
    state: {
      kind: 'enum',
      options: ['temporary', 'pending', 'full', 'error', 'incomplete', 'durable'],
      default: 'temporary',
    },
  },
};
