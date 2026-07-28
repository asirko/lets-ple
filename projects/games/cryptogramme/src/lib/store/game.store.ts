import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import { createGame, isPlayable, reduce, topCard } from '../domain/game';
import type { Action, GameOptions, GameState } from '../domain/game';
import type { Sym } from '../domain/types';

/**
 * Façade signals au-dessus du réducteur pur (`domain/game.ts`).
 *
 * Ne contient aucune règle de jeu : chaque méthode construit une `Action` et la passe à
 * `reduce()`. C'est le réducteur qui décide de ce qui change ; le store ne fait qu'exposer l'état
 * qui en résulte sous forme de signals pour les composants.
 */
export class GameStore {
  private readonly stateSignal: WritableSignal<GameState>;

  readonly state: Signal<GameState>;
  readonly topCard: Signal<Sym | null>;
  readonly canDraw: Signal<boolean>;
  /** Un booléen par case du plateau : vrai si la carte du dessus peut y être posée sans risque connu. */
  readonly playableCells: Signal<readonly boolean[]>;

  constructor(quoteId: string, text: string, options: GameOptions) {
    this.stateSignal = signal(createGame(quoteId, text, options));
    this.state = this.stateSignal.asReadonly();

    this.topCard = computed(() => topCard(this.stateSignal()));

    this.canDraw = computed(() => {
      const state = this.stateSignal();
      return (
        state.status === 'playing' &&
        state.deck.length > 0 &&
        state.hand.length < state.puzzle.handCapacity
      );
    });

    this.playableCells = computed(() => {
      const state = this.stateSignal();
      return state.board.map((_cell, index) => isPlayable(state, index));
    });
  }

  selectCell(index: number): void {
    this.dispatch({ type: 'SELECT_CELL', index });
  }

  draw(): void {
    this.dispatch({ type: 'DRAW' });
  }

  play(): void {
    this.dispatch({ type: 'PLAY' });
  }

  restart(seed: string): void {
    this.dispatch({ type: 'RESTART', seed });
  }

  private dispatch(action: Action): void {
    this.stateSignal.update((state) => reduce(state, action));
  }
}
