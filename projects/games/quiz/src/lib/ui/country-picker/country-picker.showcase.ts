import { Component, inject, ViewEncapsulation, signal } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpCountryPicker } from './country-picker';
import { STATISTICS_PREVIEW } from '../statistics-preview';
import { resolveStatsLabels } from '../stats-labels';
@Component({
  selector: 'lp-country-picker-showcase',
  imports: [LpCountryPicker],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: `<lp-country-picker
    [countries]="countries"
    [labels]="labels"
    [selected]="selected()"
    (selectedCountry)="selected.set($event)"
  />`,
})
export class LpCountryPickerShowcase {
  readonly countries = STATISTICS_PREVIEW.rows;
  readonly labels = resolveStatsLabels((k) => inject(I18nService).t(k));
  readonly selected = signal<string | null>(null);
}
export const LPCOUNTRYPICKER_SHOWCASE: ComponentShowcase<LpCountryPickerShowcase> = {
  component: LpCountryPickerShowcase,
  controls: {},
};
