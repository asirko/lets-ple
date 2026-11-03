import { Component, inject, input, ViewEncapsulation } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpKnowledgeGrouping } from './knowledge-grouping';
import type { KnowledgeGrouping } from '../../domain/knowledge-stats/grouping';
import { resolveStatsLabels } from '../stats-labels';
@Component({
  selector: 'lp-knowledge-grouping-showcase',
  imports: [LpKnowledgeGrouping],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-knowledge-grouping [grouping]="grouping()" [labels]="labels" />`,
})
export class LpKnowledgeGroupingShowcase {
  readonly labels = resolveStatsLabels((k) => inject(I18nService).t(k));
  readonly grouping = input<KnowledgeGrouping>('continent');
}
export const LPKNOWLEDGEGROUPING_SHOWCASE: ComponentShowcase<LpKnowledgeGroupingShowcase> = {
  component: LpKnowledgeGroupingShowcase,
  controls: {
    grouping: { kind: 'enum', options: ['continent', 'region', 'country'], default: 'continent' },
  },
};
