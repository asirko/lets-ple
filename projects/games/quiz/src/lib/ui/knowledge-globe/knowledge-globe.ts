import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { KnowledgeCountry } from '../../data/knowledge-data';
import type { KnowledgeLevel } from '../../domain/knowledge-stats/knowledge-level';
import { LpGlobe } from '../globe/globe';
import { LpKnowledgeGrouping } from '../knowledge-grouping/knowledge-grouping';
import { LpKnowledgeHelpDialog } from '../knowledge-help/knowledge-help-dialog';
import type { GroupLabel, KnowledgeGrouping } from '../../domain/knowledge-stats/grouping';
import type { StatsLabels } from '../statistics-models';
/**
 * Knowledge view of the globe: levels become tones, the continent focus dims the rest. How to
 * read it lives behind the help button so the map keeps the room.
 */
@Component({
  selector: 'lp-knowledge-globe',
  imports: [LpGlobe, LpKnowledgeGrouping, LpKnowledgeHelpDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section>
    <div class="quiz-stats-globe-heading">
      <h2>{{ labels()['globe'] }}</h2>
      <button
        class="quiz-stats-help-button"
        type="button"
        [attr.aria-label]="labels()['help']"
        [title]="labels()['help']"
        (click)="helpOpen.set(true)"
      >
        ?
      </button>
    </div>
    @if (failed()) {
      <p role="status">{{ labels()['globeFallback'] }}</p>
    }
    <lp-globe
      [places]="countries()"
      [tones]="levels()"
      [labels]="groupNames()"
      [dimmed]="dimmed()"
      [selected]="selected()"
      [label]="labels()['globe']"
      (countrySelect)="selectedCountry.emit($event)"
      (unavailable)="failed.set(true); unavailable.emit()"
    />
    <lp-knowledge-grouping
      [grouping]="grouping()"
      [labels]="labels()"
      (groupingChanged)="groupingChanged.emit($event)"
    />
    <lp-knowledge-help-dialog
      [open]="helpOpen()"
      [labels]="labels()"
      (closed)="helpOpen.set(false)"
    />
  </section>`,
})
export class LpKnowledgeGlobe {
  readonly labels = input.required<StatsLabels>();
  readonly countries = input.required<readonly KnowledgeCountry[]>();
  readonly levels = input.required<ReadonlyMap<string, KnowledgeLevel>>();
  readonly selected = input<string | null>(null);
  readonly continent = input<string | null>(null);
  readonly grouping = input<KnowledgeGrouping>('continent');
  /** Group names drawn on the globe instead of the countries', when grouped. */
  readonly groupNames = input<readonly GroupLabel[] | null>(null);
  readonly selectedCountry = output<string>();
  readonly groupingChanged = output<KnowledgeGrouping>();
  readonly unavailable = output<void>();
  protected readonly failed = signal(false);
  protected readonly helpOpen = signal(false);
  protected readonly dimmed = computed<ReadonlySet<string>>(() => {
    const continent = this.continent();
    return new Set(
      continent ? this.countries().flatMap((c) => (c.continent === continent ? [] : [c.iso3])) : [],
    );
  });
  private readonly globe = viewChild.required(LpGlobe);
  constructor() {
    effect(() => {
      const selected = this.selected();
      if (selected) untracked(() => this.globe().centerOn(selected));
    });
  }
}
