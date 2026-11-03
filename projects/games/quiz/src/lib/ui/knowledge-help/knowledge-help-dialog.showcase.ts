import { Component, inject, ViewEncapsulation } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpKnowledgeHelpDialog } from './knowledge-help-dialog';
import { resolveStatsLabels } from '../stats-labels';
@Component({
  selector: 'lp-knowledge-help-dialog-showcase',
  imports: [LpKnowledgeHelpDialog],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-knowledge-help-dialog [open]="true" [labels]="labels" />`,
})
export class LpKnowledgeHelpDialogShowcase {
  readonly labels = resolveStatsLabels((k) => inject(I18nService).t(k));
}
export const LPKNOWLEDGEHELPDIALOG_SHOWCASE: ComponentShowcase<LpKnowledgeHelpDialogShowcase> = {
  component: LpKnowledgeHelpDialogShowcase,
  controls: {},
};
