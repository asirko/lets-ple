import { ChangeDetectionStrategy, Component, type OnInit, ViewEncapsulation, input } from '@angular/core';
import { LpButton, LpPanel } from '@lets-ple/ui';
import { GameStore } from '../../store/game.store';
import { LpCipherTable } from '../cipher-table/lp-cipher-table';
import { LpCryptogramDeck } from '../cryptogram-deck/lp-cryptogram-deck';
import { LpCryptogramGrid } from '../cryptogram-grid/lp-cryptogram-grid';
import { LpCryptogramHand } from '../cryptogram-hand/lp-cryptogram-hand';
import { LpErrorCounter } from '../error-counter/lp-error-counter';

/**
 * Écran de jeu : assemble les six composants de présentation autour d'un `GameStore` construit à
 * partir des inputs (citation, auteur, source, graine). Agnostique de la provenance de ces
 * données — aucun chargement de corpus ici, ce sera le rôle de l'appelant (tâches 16-17).
 *
 * C'est aussi le point d'entrée routé du jeu (voir `routes.ts`, `loadComponent`) : c'est donc lui,
 * et lui seul parmi les composants du jeu, qui référence le module SCSS `_cryptogramme.scss`. Avec
 * le builder esbuild d'Angular, un `styleUrls` porté par un composant chargé via `loadComponent`
 * part dans le même chunk lazy que ce composant — c'est ce qui garantit que `_cryptogramme.scss`
 * ne finit jamais dans le bundle du portail (voir
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
    LpCryptogramHand,
    LpErrorCounter,
    LpButton,
    LpPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_cryptogramme.scss'],
  template: `
    <lp-panel class="crypto-page" padding="md">
      <div class="crypto-page-header">
        <lp-error-counter
          [errors]="store.state().errors"
          [maxErrors]="store.state().puzzle.maxErrors"
        />
        <lp-cryptogram-deck
          [remaining]="store.state().deck.length"
          [handFull]="store.state().hand.length >= store.state().puzzle.handCapacity"
          (draw)="store.draw()"
        />
      </div>

      <lp-cryptogram-hand [hand]="store.state().hand" (playTop)="store.play()" />

      <lp-cryptogram-grid
        [board]="store.state().board"
        [selectedCell]="store.state().selectedCell"
        [playableCells]="store.playableCells()"
        (cellSelect)="store.selectCell($event)"
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
