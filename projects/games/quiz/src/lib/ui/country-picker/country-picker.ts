import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { KnowledgeCountry } from '../../data/knowledge-data';
import type { StatsLabels } from '../statistics-models';
@Component({
  selector: 'lp-country-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="quiz-stats-filters">
    <label
      >{{ labels()['chooseCountry'] }}
      <select
        [attr.aria-label]="labels()['chooseCountry']"
        [value]="selected() || ''"
        (change)="choose($any($event.target))"
      >
        <option value="">{{ labels()['chooseCountryHint'] }}</option>
        @for (country of ordered(); track country.iso3) {
          <option [value]="country.iso3">{{ country.name }}</option>
        }
      </select>
    </label>
  </div>`,
})
export class LpCountryPicker {
  readonly countries = input.required<readonly KnowledgeCountry[]>();
  readonly selected = input<string | null>(null);
  readonly labels = input.required<StatsLabels>();
  readonly selectedCountry = output<string>();
  readonly ordered = computed(() =>
    [...this.countries()].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  );
  choose(select: HTMLSelectElement): void {
    if (select.value) this.selectedCountry.emit(select.value);
    // A dismissed country can be selected again, even when the signal was already null.
    select.value = this.selected() || '';
  }
}
