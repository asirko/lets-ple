import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { loadGeography } from '../../data/geography';
import type { Country } from '../../domain/types';
import { countryAnchor } from '../../globe/globe-geography';
import type { GlobePlace, GlobeTone } from '../../globe/globe-port';
import { LpGlobe } from './globe';
const LEVELS = ['none', 'insufficient', 'low', 'medium', 'high'] as const;
@Component({
  selector: 'lp-globe-showcase',
  imports: [LpGlobe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_globe.scss'],
  template: `
    @if (country(); as c) {
      <lp-globe
        [places]="places()"
        [tones]="tones()"
        [dimmed]="dimmed()"
        [selected]="c.iso3"
        [label]="c.name"
        [staticOnly]="staticOnly()"
        [fallbackShape]="c.geometry ?? null"
        (countrySelect)="tapped.set($event)"
      />
      <p>{{ tapped() ?? '—' }}</p>
    } @else {
      <p>{{ i18n.t(failed() ? 'quiz.showcase.error' : 'quiz.showcase.loading') }}</p>
    }
  `,
})
export class LpGlobeShowcase {
  readonly countryCode = input('FRA');
  readonly palette = input<'solution' | 'connaissances'>('solution');
  readonly dimOutsideContinent = input(false);
  readonly staticOnly = input(false);
  readonly countries = signal<readonly Country[]>([]);
  readonly failed = signal(false);
  readonly tapped = signal<string | null>(null);
  protected readonly i18n = inject(I18nService);
  readonly country = computed(() => this.countries().find((c) => c.iso3 === this.countryCode()));
  readonly places = computed<readonly GlobePlace[]>(() =>
    this.countries().flatMap((c) =>
      c.geometry ? [{ iso3: c.iso3, name: c.name, anchor: countryAnchor(c.geometry) }] : [],
    ),
  );
  readonly tones = computed<ReadonlyMap<string, GlobeTone>>(() =>
    this.palette() === 'solution'
      ? new Map([[this.countryCode(), 'highlight']])
      : new Map(this.countries().map((c, i) => [c.iso3, LEVELS[i % LEVELS.length]])),
  );
  readonly dimmed = computed<ReadonlySet<string>>(() => {
    const continent = this.country()?.continent;
    return new Set(
      this.dimOutsideContinent()
        ? this.countries().flatMap((c) => (c.continent === continent ? [] : [c.iso3]))
        : [],
    );
  });
  private readonly globe = viewChild(LpGlobe);
  constructor() {
    effect(() => {
      const globe = this.globe(),
        code = this.countryCode();
      untracked(() => globe?.centerOn(code));
    });
    const controller = new AbortController();
    inject(DestroyRef).onDestroy(() => controller.abort());
    void loadGeography(controller.signal)
      .then((c) => this.countries.set(c))
      .catch(() => {
        if (!controller.signal.aborted) this.failed.set(true);
      });
  }
}
export const LP_GLOBE_SHOWCASE: ComponentShowcase<LpGlobeShowcase> = {
  component: LpGlobeShowcase,
  controls: {
    countryCode: {
      kind: 'enum',
      options: ['FRA', 'JPN', 'NZL', 'BRA', 'ZAF', 'VAT', 'FJI'],
      default: 'FRA',
    },
    palette: { kind: 'enum', options: ['solution', 'connaissances'], default: 'solution' },
    dimOutsideContinent: { kind: 'boolean', default: false },
    staticOnly: { kind: 'boolean', default: false },
  },
};
