import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { resolveStatsLabels } from '../stats-labels';
import { Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpCountryList } from './country-list';
import { STATISTICS_PREVIEW } from '../statistics-preview';
@Component({
  selector: 'lp-country-list-showcase',
  imports: [LpCountryList],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-country-list [rows]="preview.rows" [labels]="preview.labels" />`,
})
export class LpCountryListShowcase {
  readonly preview = {
    ...STATISTICS_PREVIEW,
    labels: resolveStatsLabels((k) => inject(I18nService).t(k)),
  };
  readonly state = input('temporary');
}
export const LPCOUNTRYLIST_SHOWCASE: ComponentShowcase<LpCountryListShowcase> = {
  component: LpCountryListShowcase,
  controls: {},
};
