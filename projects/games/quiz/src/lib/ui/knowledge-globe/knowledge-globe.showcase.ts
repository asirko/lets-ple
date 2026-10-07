import { Component, inject, ViewEncapsulation } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpKnowledgeGlobe } from './knowledge-globe';
import { STATISTICS_PREVIEW } from '../statistics-preview';
import { resolveStatsLabels } from '../stats-labels';
@Component({
  selector: 'lp-knowledge-globe-showcase',
  imports: [LpKnowledgeGlobe],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-knowledge-globe
    [countries]="preview.rows"
    [levels]="levels"
    [labels]="preview.labels"
  />`,
})
export class LpKnowledgeGlobeShowcase {
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
export const LPKNOWLEDGEGLOBE_SHOWCASE: ComponentShowcase<LpKnowledgeGlobeShowcase> = {
  component: LpKnowledgeGlobeShowcase,
  controls: {},
};
