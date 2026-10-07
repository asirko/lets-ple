import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { loadGeography } from '../../data/geography';
import type { Country } from '../../domain/types';
import { SilhouetteReview } from './silhouette-review';

/** Revue du corpus réel, accessible uniquement depuis l'espace de développement. */
@Component({
  selector: 'lp-silhouette-review-page',
  imports: [RouterLink, SilhouetteReview],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss'],
  template: `
    <a routerLink="/dev/components">Retour au showcase</a>
    <h1>{{ focused ? 'France — revue de la silhouette' : 'Revue des silhouettes' }}</h1>
    @if (focused) {
      <a routerLink="/dev/components/quiz-silhouettes">Voir les 195 pays</a>
      <p>
        La silhouette centrée sur la métropole et la Corse est intégrée au quiz. L’ancien rendu sans
        encadrés est conservé en dessous pour comparaison.
      </p>
      <p>
        Sources de référence :
        <a href="https://www.geoboundaries.org/api.html" target="_blank" rel="noopener"
          >geoBoundaries (gBOpen, ADM0)</a
        >
        ·
        <a
          href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-minor-islands/"
          target="_blank"
          rel="noopener"
          >Natural Earth — petites îles</a
        >. Les aperçus ci-dessous utilisent uniquement notre corpus Natural Earth actuel, pas ces
        alternatives.
      </p>
    } @else {
      <a routerLink="/dev/components/quiz-silhouettes-selection"
        >Revoir la silhouette de la France</a
      >
      <p>Relève les noms ou codes des pays dont la silhouette est inexploitable.</p>
    }
    @if (countries(); as countries) {
      <lp-silhouette-review [countries]="countries" [focused]="focused" />
    } @else if (failed()) {
      <p role="alert">Impossible de charger les pays.</p>
      <button type="button" class="b-button b-secondary" (click)="load()">Réessayer</button>
    } @else {
      <p role="status">Chargement des silhouettes…</p>
    }
  `,
})
export class SilhouetteReviewPage {
  protected readonly focused = inject(ActivatedRoute).snapshot.data['focused'] === true;
  protected readonly countries = signal<readonly Country[] | null>(null);
  protected readonly failed = signal(false);
  private readonly controller = new AbortController();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller.abort());
    void this.load();
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      this.countries.set(await loadGeography(this.controller.signal));
    } catch {
      if (!this.controller.signal.aborted) this.failed.set(true);
    }
  }
}
