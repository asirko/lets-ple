import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import type { StorageService } from '@lets-ple/game-core';
import type { DictionaryPort } from '../domain/dictionary';
import {
  createMatch,
  reduce,
  restoreMatch,
  type Action,
  type GameState,
  type PlayerState,
} from '../domain/game';

const ACTIVE_MATCH_KEY = 'dernierMot:activeMatch';

/** Façade signals : elle délègue toutes les règles au réducteur pur et persiste son résultat. */
export class DernierMotGameStore {
  private readonly stateSignal: WritableSignal<GameState | null>;

  readonly state: Signal<GameState | null>;
  readonly currentPlayer: Signal<PlayerState | null>;
  readonly activePlayers: Signal<readonly PlayerState[]>;
  readonly playerAfterResult: Signal<PlayerState | null>;
  readonly canStartNextRound: Signal<boolean>;
  readonly winners: Signal<readonly PlayerState[]>;

  private constructor(
    private readonly dictionary: DictionaryPort,
    private readonly storage: StorageService,
    initialState: GameState | null,
    persistInitialState: boolean,
  ) {
    this.stateSignal = signal(initialState);
    this.state = this.stateSignal.asReadonly();
    this.currentPlayer = computed(() => {
      const state = this.stateSignal();
      return state?.players.find((player) => player.id === state.currentPlayerId) ?? null;
    });
    this.activePlayers = computed(
      () => this.stateSignal()?.players.filter((player) => player.active) ?? [],
    );
    this.playerAfterResult = computed(() => {
      const state = this.stateSignal();
      if (state?.phase !== 'turn-result') return null;
      if (state.players.filter((player) => player.active).length <= 1) return null;
      const preview = reduce(state, { type: 'ACKNOWLEDGE_RESULT' }, this.dictionary);
      return preview.players.find((player) => player.id === preview.currentPlayerId) ?? null;
    });
    this.canStartNextRound = computed(() => this.stateSignal()?.phase === 'round-result');
    this.winners = computed(() => {
      const state = this.stateSignal();
      if (!state) return [];
      return state.players.filter((player) => state.winners.includes(player.id));
    });

    if (persistInitialState && initialState) this.persist(initialState);
  }

  static create(
    players: readonly string[],
    dictionary: DictionaryPort,
    storage: StorageService,
    seed = createSeed(),
  ): DernierMotGameStore {
    return new DernierMotGameStore(
      dictionary,
      storage,
      createMatch(players, dictionary, seed),
      true,
    );
  }

  static resume(dictionary: DictionaryPort, storage: StorageService): DernierMotGameStore {
    const state = restoreMatch(storage.read<unknown>(ACTIVE_MATCH_KEY, null), dictionary);
    return new DernierMotGameStore(dictionary, storage, state, false);
  }

  playLetter(letter: string): void {
    this.dispatch({ type: 'PLAY_LETTER', letter });
  }

  acknowledgeResult(): void {
    this.dispatch({ type: 'ACKNOWLEDGE_RESULT' });
  }

  startNextRound(): void {
    this.dispatch({ type: 'START_NEXT_ROUND' });
  }

  restart(): void {
    this.storage.remove(ACTIVE_MATCH_KEY);
    this.stateSignal.set(null);
  }

  private dispatch(action: Action): void {
    const state = this.stateSignal();
    if (!state) return;
    const nextState = reduce(state, action, this.dictionary);
    this.stateSignal.set(nextState);
    this.persist(nextState);
  }

  private persist(state: GameState): void {
    this.storage.write(ACTIVE_MATCH_KEY, state);
  }
}

function createSeed(): string {
  return `${Date.now()}-${Math.random()}`;
}
