import { ChangeDetectionStrategy, Component, type OnInit, ViewEncapsulation, input } from '@angular/core';
import { LpButton, LpPanel } from '@lets-ple/ui';
import { GameStore } from '../../store/game.store';
import { LpCipherTable } from '../cipher-table/lp-cipher-table';
import { LpCryptogramDeck } from '../cryptogram-deck/lp-cryptogram-deck';
import { LpCryptogramGrid } from '../cryptogram-grid/lp-cryptogram-grid';
import { LpCryptogramPiles } from '../cryptogram-piles/lp-cryptogram-piles';
import { LpErrorCounter } from '../error-counter/lp-error-counter';

/**
 * Écran de jeu : assemble les six composants de présentation autour d'un `GameStore` construit à
 * partir des inputs (citation, auteur, source, graine). Agnostique de la provenance de ces
 * données — la résolution d'une citation au hasard dans le corpus est à la charge de l'appelant
 * (`LpGameRoute`, voir `routes.ts`), ce qui garde ce composant pilotable par inputs explicites en
 * Storybook.
 *
 * C'est lui, et lui seul parmi les composants du jeu, qui référence le module SCSS
 * `_cryptogramme.scss`. Avec le builder esbuild d'Angular, un `styleUrls` porté par un composant
 * chargé (directement ou transitivement) via `loadComponent` part dans le même chunk lazy — c'est
 * ce qui garantit que `_cryptogramme.scss` ne finit jamais dans le bundle du portail (voir
 * docs/superpowers/specs/2026-07-28-architecture-css-smacss-design.md, section « Chargement »).
 * `ViewEncapsulation.None` est nécessaire en complément : ce fichier définit des classes globales
 * `crypto-*` consommées par tous les composants du jeu, pas du style scopé à ce seul composant.
 */
@Component({
  selector: 'lp-game-page',
  imports: [
    LpCipherTable,
    LpCryptogramDeck,
    LpCryptogramGrid,
    LpCryptogramPiles,
    LpErrorCounter,
    LpButton,
    LpPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_cryptogramme.scss'],
  template: `
    <lp-panel padding="md">
      <div class="crypto-page">
        <div class="crypto-page-header">
          <lp-error-counter
            [errors]="store.state().errors"
            [maxErrors]="store.state().puzzle.maxErrors"
          />
          <lp-cryptogram-deck
            [remaining]="store.state().deck.length"
            (draw)="store.draw()"
          />
        </div>

        <lp-cryptogram-piles
          [piles]="store.state().piles"
          [selectedPile]="store.state().selectedPile"
          (pileSelect)="store.selectPile($event)"
        />

        <lp-cryptogram-grid
          [board]="store.state().board"
          [playableCells]="store.playableCells()"
          (cellSelect)="store.play($event)"
        />

        <lp-cipher-table [known]="store.state().known" />

        @if (store.state().status === 'won') {
          <div class="crypto-page-result crypto-page-result-won" role="alert">
            <p class="crypto-page-result-title">Bravo, citation reconstituée !</p>
            <p class="crypto-page-result-attribution">{{ author() }} — {{ source() }}</p>
            <lp-button variant="primary" (click)="onRestart()">Rejouer</lp-button>
          </div>
        } @else if (store.state().status === 'lost') {
          <div class="crypto-page-result crypto-page-result-lost" role="alert">
            <p class="crypto-page-result-title">Perdu — trop d'erreurs.</p>
            <p class="crypto-page-result-attribution">{{ author() }} — {{ source() }}</p>
            <lp-button variant="primary" (click)="onRestart()">Rejouer</lp-button>
          </div>
        }
      </div>
    </lp-panel>
  `,
})
export class LpGamePage implements OnInit {
  readonly quoteId = input.required<string>();
  readonly text = input.required<string>();
  readonly author = input.required<string>();
  readonly source = input.required<string>();
  readonly seed = input.required<string>();

  /**
   * Construit une seule fois, en `ngOnInit` plutôt qu'en initialiseur de champ : les inputs
   * `required` ne sont garantis résolus qu'à partir de ce point du cycle de vie du composant.
   */
  protected store!: GameStore;

  ngOnInit(): void {
    this.store = new GameStore(this.quoteId(), this.text(), { seed: this.seed() });
  }

  /** Rejouer : nouvelle graine, même citation — l'origine de la graine est une préoccupation UI. */
  protected onRestart(): void {
    this.store.restart(crypto.randomUUID());
  }
}
