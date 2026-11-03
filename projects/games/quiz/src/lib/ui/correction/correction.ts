import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { LpDialog, LpButton } from '@lets-ple/ui';
import type { Country } from '../../domain/types';
import type { GameState } from '../../domain/game';
import { countryAnchor } from '../../globe/globe-geography';
import type { GlobePlace, GlobeTone } from '../../globe/globe-port';
import { LpGlobe } from '../globe/globe';
@Component({
  selector: 'lp-quiz-correction',
  imports: [LpDialog, LpButton, LpGlobe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state().phase === 'correction') {
      <lp-dialog
        class="quiz-correction"
        [class.is-correct]="state().correct"
        [class.is-incorrect]="!state().correct"
        [open]="true"
        [title]="i18n.t(state().correct ? 'quiz.correct' : 'quiz.incorrect')"
        [closeOnEscape]="false"
      >
        <div lpDialogBody class="quiz-correction-body quiz-feedback">
          <div>
            <p class="quiz-correction-caption">{{ i18n.t('quiz.correction.solution') }}</p>
            <p class="quiz-correction-answer">{{ correctLabels().join(' / ') }}</p>
          </div>
          <div class="quiz-correction-facts">
            <p>
              <span class="quiz-correction-caption">{{ i18n.t('quiz.correction.submitted') }}</span
              ><br /><strong>{{ state().submittedAnswer }}</strong>
            </p>
            <strong>{{ i18n.t('quiz.correction.points', { n: state().awarded }) }}</strong>
          </div>
          <figure class="quiz-globe-figure">
            @if (country().geometry; as shape) {
              <lp-globe
                [places]="places()"
                [tones]="tones()"
                [selected]="country().iso3"
                [label]="i18n.t('quiz.globe.alt', { country: country().name })"
                [staticOnly]="staticGlobe()"
                [fallbackShape]="shape"
                (unavailable)="globeDown.set(true)"
              />
            } @else {
              <p class="quiz-globe-fallback">{{ i18n.t('quiz.globe.missing') }}</p>
            }
            <figcaption>
              <strong>{{ country().name }}</strong>
              @if (country().geometry && !staticGlobe() && !globeDown()) {
                <span>{{ i18n.t('quiz.globe.help') }}</span>
              }
            </figcaption>
          </figure>
          @if (country().geometry && !staticGlobe() && !globeDown()) {
            <lp-button variant="secondary" (click)="recenter()">{{
              i18n.t('quiz.globe.recenter')
            }}</lp-button>
          }
          <section class="quiz-country-info" [attr.aria-label]="country().name">
            <div class="quiz-country-heading">
              <img
                class="quiz-country-flag"
                [src]="country().flag"
                [alt]="i18n.t('quiz.country.flag', { country: country().name })"
              />
              <h3>{{ country().name }}</h3>
            </div>
            @if (!country().flagEligible) {
              <p class="quiz-country-note">{{ i18n.t('quiz.country.flagNote') }}</p>
            }
            <dl>
              <div>
                <dt>
                  {{
                    i18n.t(
                      country().capitalEligible ? 'quiz.country.capitals' : 'quiz.country.cities'
                    )
                  }}
                </dt>
                <dd>
                  {{
                    country().capitals.length
                      ? country().capitals.join(' / ')
                      : i18n.t('quiz.country.noCapitals')
                  }}
                </dd>
              </div>
              <div>
                <dt>{{ i18n.t('quiz.country.neighbors') }}</dt>
                <dd>
                  {{
                    neighbors().length ? neighbors().join(', ') : i18n.t('quiz.country.noNeighbors')
                  }}
                </dd>
              </div>
              <div>
                <dt>{{ i18n.t('quiz.country.region') }}</dt>
                <dd>
                  {{ i18n.t('quiz.region.' + country().continent) }} ·
                  {{ i18n.t('quiz.region.' + country().subregion) }}
                </dd>
              </div>
            </dl>
            @if (!country().capitalEligible) {
              <p class="quiz-country-note">{{ i18n.t('quiz.country.capitalNote') }}</p>
            }
          </section>
        </div>
        <div lpDialogActions>
          <lp-button (click)="next.emit()">{{
            i18n.t(last() ? 'quiz.results' : 'quiz.next')
          }}</lp-button>
        </div>
      </lp-dialog>
    }
  `,
})
export class LpQuizCorrection {
  readonly state = input.required<GameState>();
  readonly correctLabels = input.required<readonly string[]>();
  readonly country = input.required<Country>();
  readonly countries = input.required<readonly Country[]>();
  readonly staticGlobe = input(false);
  readonly next = output<void>();
  protected readonly i18n = inject(I18nService);
  protected readonly last = computed(
    () => this.state().index === this.state().questions.length - 1,
  );
  protected readonly globeDown = signal(false);
  protected readonly places = computed<readonly GlobePlace[]>(() =>
    this.countries().flatMap((c) =>
      c.geometry ? [{ iso3: c.iso3, name: c.name, anchor: countryAnchor(c.geometry) }] : [],
    ),
  );
  protected readonly tones = computed<ReadonlyMap<string, GlobeTone>>(
    () => new Map([[this.country().iso3, 'highlight']]),
  );
  private readonly globe = viewChild(LpGlobe);
  constructor() {
    effect(() => {
      this.globe();
      this.country();
      untracked(() => this.recenter());
    });
  }
  protected recenter(): void {
    this.globe()?.centerOn(this.country().iso3, { zoom: true });
  }
  protected readonly neighbors = computed(() =>
    this.countries()
      .filter((c) => this.country().borders.includes(c.iso3))
      .map((c) => c.name)
      .sort((a, b) => a.localeCompare(b, 'fr')),
  );
}
