import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LpPanel } from '@lets-ple/ui';
import type { Country } from '../../domain/types';
import { silhouette, EXCLUDED_SILHOUETTE_COUNTRIES } from '../../domain/silhouette';
import { reviewSilhouette } from './review-projection';
import { approvedComposition, reviewComposition } from '../../domain/silhouette-composition';
import { ComposedSilhouette } from './composed-silhouette';

export const REVIEW_COUNTRIES = new Set<string>();

@Component({
  selector: 'lp-silhouette-review',
  imports: [LpPanel, ComposedSilhouette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>{{ entries().length }} pays · ordre alphabétique</p>
    <div class="quiz-review-grid">
      @for (entry of entries(); track entry.country.iso3) {
        <lp-panel [class.quiz-review-composed]="!!entry.composition">
          <h2>{{ entry.country.name }}</h2>
          <p class="quiz-eyebrow">{{ entry.country.iso3 }}</p>
          @if (entry.excluded) {
            <p>Exclu des questions de silhouette — conservé pour les autres catégories.</p>
          }
          @if (entry.composition; as composition) {
            <h3>
              {{
                composition.kind === 'compact'
                  ? 'Îles rapprochées'
                  : 'Vue principale et îles à côté'
              }}
            </h3>
            <p>
              Nord en haut · distances réduites · échelle propre à chaque boîte. Tous les contours
              du corpus sont conservés.
              {{ focused() ? 'Proposition à valider.' : 'Version intégrée au quiz.' }}
            </p>
            <lp-composed-silhouette [composition]="composition" [label]="entry.country.name" />
          }
          @if (focused()) {
            <h3>Rendu actuel du quiz</h3>
          }
          @if (entry.shape; as shape) {
            <svg
              class="quiz-silhouette"
              [attr.viewBox]="shape.viewBox"
              role="img"
              [attr.aria-label]="'Silhouette : ' + entry.country.name"
            >
              <path [attr.d]="shape.path" fill-rule="evenodd" />
            </svg>
            @if (focused() && entry.preview; as preview) {
              <h3>Aperçu avec cadrage corrigé</h3>
              <svg
                class="quiz-silhouette"
                [attr.viewBox]="preview.viewBox"
                role="img"
                [attr.aria-label]="'Cadrage corrigé : ' + entry.country.name"
              >
                <path [attr.d]="preview.path" fill-rule="evenodd" />
              </svg>
              <details>
                <summary>Examiner les {{ entry.parts.length }} zones séparément</summary>
                <p>
                  Un encadré par polygone terrestre de la source, dans son ordre d’origine. Chaque
                  zone est agrandie indépendamment : tailles et distances ne sont pas comparables.
                  Un atoll peut occuper plusieurs encadrés. Aucun nom d’île n’est fourni par ces
                  données.
                </p>
                <div class="quiz-review-insets">
                  @for (part of entry.parts; track $index) {
                    <figure>
                      <svg
                        class="quiz-silhouette"
                        [attr.viewBox]="part.viewBox"
                        role="img"
                        [attr.aria-label]="entry.country.name + ' — zone ' + ($index + 1)"
                      >
                        <path [attr.d]="part.path" fill-rule="evenodd" />
                      </svg>
                      <figcaption>Zone {{ $index + 1 }}</figcaption>
                    </figure>
                  }
                </div>
              </details>
            }
          } @else if (!entry.composition) {
            <p class="quiz-review-missing">Silhouette indisponible — absente du quiz</p>
          }
        </lp-panel>
      }
    </div>
  `,
})
export class SilhouetteReview {
  readonly countries = input.required<readonly Country[]>();
  readonly focused = input(false);
  protected readonly entries = computed(() =>
    [...this.countries()]
      .filter((country) => !this.focused() || REVIEW_COUNTRIES.has(country.iso3))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .map((country) => ({
        country,
        excluded: EXCLUDED_SILHOUETTE_COUNTRIES.has(country.iso3),
        composition: this.focused() ? reviewComposition(country) : approvedComposition(country),
        shape:
          country.geometry && (this.focused() || !approvedComposition(country))
            ? silhouette(country.geometry, country.iso3)
            : null,
        preview: this.focused() && country.geometry ? reviewSilhouette(country.geometry) : null,
        parts:
          this.focused() && country.geometry
            ? (country.geometry.type === 'Polygon'
                ? [country.geometry.coordinates]
                : country.geometry.coordinates
              ).map((coordinates) => reviewSilhouette({ type: 'Polygon', coordinates }))
            : [],
      })),
  );
}
