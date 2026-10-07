import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { resolveStatsLabels } from '../stats-labels';
import { Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpKnowledgeLegend } from './knowledge-legend';
import { STATISTICS_PREVIEW } from '../statistics-preview';
@Component({
  selector: 'lp-knowledge-legend-showcase',
  imports: [LpKnowledgeLegend],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-knowledge-legend [labels]="preview.labels" />`,
})
export class LpKnowledgeLegendShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly state = input('temporary');
}
export const LPKNOWLEDGELEGEND_SHOWCASE: ComponentShowcase<LpKnowledgeLegendShowcase> = {
  component: LpKnowledgeLegendShowcase,
  controls: {},
};
