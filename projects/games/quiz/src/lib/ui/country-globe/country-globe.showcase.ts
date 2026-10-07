import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
  signal,
  computed,
  DestroyRef,
  inject,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { loadGeography } from '../../data/geography';
import type { Country } from '../../domain/types';
import { LpCountryGlobe } from './country-globe';
@Component({
  selector: 'lp-quiz-globe-showcase',
  imports: [LpCountryGlobe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss', '../../../styles/_quiz-correction.scss'],
  template: `
    @if (country(); as c) {
      <lp-country-globe [country]="c" [countries]="countries()" [staticOnly]="staticOnly()" />
    } @else {
      <p>{{ i18n.t(failed() ? 'quiz.showcase.error' : 'quiz.showcase.loading') }}</p>
    }
  `,
})
export class QuizGlobeShowcase {
  readonly countryCode = input('FRA');
  readonly staticOnly = input(false);
  readonly missingGeometry = input(false);
  readonly countries = signal<readonly Country[]>([]);
  readonly failed = signal(false);
  protected readonly i18n = inject(I18nService);
  readonly country = computed(() => {
    const c = this.countries().find((c) => c.iso3 === this.countryCode());
    return c && this.missingGeometry() ? { ...c, geometry: undefined } : c;
  });
  constructor() {
    const controller = new AbortController();
    inject(DestroyRef).onDestroy(() => controller.abort());
    void loadGeography(controller.signal)
      .then((c) => this.countries.set(c))
      .catch(() => {
        if (!controller.signal.aborted) this.failed.set(true);
      });
  }
}
export const QUIZ_GLOBE_SHOWCASE: ComponentShowcase<QuizGlobeShowcase> = {
  component: QuizGlobeShowcase,
  controls: {
    countryCode: {
      kind: 'enum',
      options: ['FRA', 'JPN', 'NZL', 'BRA', 'ZAF', 'VAT', 'FJI'],
      default: 'FRA',
    },
    staticOnly: { kind: 'boolean', default: false },
    missingGeometry: { kind: 'boolean', default: false },
  },
};
