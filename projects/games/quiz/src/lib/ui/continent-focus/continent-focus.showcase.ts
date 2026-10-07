import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { resolveStatsLabels } from '../stats-labels';
import { Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpContinentFocus } from './continent-focus';
import { STATISTICS_PREVIEW } from '../statistics-preview';
@Component({
  selector: 'lp-continent-focus-showcase',
  imports: [LpContinentFocus],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-continent-focus [labels]="preview.labels" />`,
})
export class LpContinentFocusShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly state = input('temporary');
}
export const LPCONTINENTFOCUS_SHOWCASE: ComponentShowcase<LpContinentFocusShowcase> = {
  component: LpContinentFocusShowcase,
  controls: {},
};
