import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { LpDialog, LpButton } from '@lets-ple/ui';
import type { Country } from '../../domain/types';
import type { GameState } from '../../domain/game';
import { LpCountryGlobe } from '../country-globe/country-globe';
@Component({
  selector: 'lp-quiz-correction',
  imports: [LpDialog, LpButton, LpCountryGlobe],
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
          <lp-country-globe
            [country]="country()"
            [countries]="countries()"
            [staticOnly]="staticGlobe()"
          />
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
  protected readonly neighbors = computed(() =>
    this.countries()
      .filter((c) => this.country().borders.includes(c.iso3))
      .map((c) => c.name)
      .sort((a, b) => a.localeCompare(b, 'fr')),
  );
}
