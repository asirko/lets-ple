import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { DictionaryPort } from '../../domain/dictionary';
import type { DefinitionForm } from '../../dictionary/serialized-dictionary';
import type { DernierMotGameStore } from '../../store/game.store';
import { LpLetterKeyboard } from '../letter-keyboard/lp-letter-keyboard';
import { LpScoreboard } from '../scoreboard/lp-scoreboard';
import { LpTurnDialog, type TurnDialogView } from '../turn-dialog/lp-turn-dialog';
import { LpWordProgress } from '../word-progress/lp-word-progress';

export interface DernierMotDictionaryView extends DictionaryPort {
  definitions(word: string): Promise<readonly DefinitionForm[]>;
}

/** Assemble le store et les vues de présentation sans réinterpréter les règles du moteur. */
@Component({
  selector: 'lp-dernier-mot-game-page',
  imports: [LpLetterKeyboard, LpScoreboard, LpTurnDialog, LpWordProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (store().state(); as state) {
      <main #gameBoard class="dernier-mot-game" data-game-board tabindex="-1">
        <header class="dernier-mot-game-heading">
          <p>{{ text('dernierMot.game.round', { round: state.round }) }}</p>
          <h1>{{ text('dernierMot.title') }}</h1>
          <p>{{ turnStatus() }}</p>
        </header>

        <lp-scoreboard
          [players]="state.players"
          [currentPlayerId]="state.currentPlayerId"
          [winnerIds]="state.winners"
        />

        <lp-word-progress
          [prefix]="state.prefix"
          [isWord]="prefixLookup().isWord"
          [continuationCount]="prefixLookup().continuationCount"
          [attemptedLetter]="attemptedLetter()"
        />

        <lp-letter-keyboard
          [disabled]="dialogView() !== null"
          (letterSelected)="store().playLetter($event)"
        />

        @for (view of dialogViews(); track view.kind) {
          <lp-turn-dialog
            [open]="true"
            [view]="view"
            [definitionExpanded]="definitionExpanded()"
            (definitionToggled)="definitionExpanded.set(!definitionExpanded())"
            (primaryAction)="handlePrimaryAction()"
          />
        }
      </main>
    }
  `,
})
export class LpDernierMotGamePage {
  readonly store = input.required<DernierMotGameStore>();
  readonly dictionary = input.required<DernierMotDictionaryView>();
  readonly announceFirstPlayer = input(false);
  readonly restartRequested = output<void>();

  protected readonly definitionExpanded = signal(false);
  private readonly firstPlayerAcknowledged = signal(false);
  private readonly definitions = signal<readonly string[]>([]);
  private definitionRequest = 0;
  private definitionWord = '';
  private readonly board = viewChild<ElementRef<HTMLElement>>('gameBoard');
  private readonly i18n = inject(I18nService);

  protected readonly turnStatus = computed(() => {
    const currentPlayer = this.store().currentPlayer();
    return currentPlayer?.active
      ? this.text('dernierMot.game.currentTurn', { name: currentPlayer.name })
      : this.text('dernierMot.game.turnEnded');
  });

  protected readonly prefixLookup = computed(() => {
    const prefix = this.store().state()?.prefix ?? '';
    return this.dictionary().lookup(prefix);
  });

  protected readonly attemptedLetter = computed(() => {
    const state = this.store().state();
    if (state?.resolution?.kind !== 'invalid-letter') return '';
    return state.resolution.attemptedPrefix.slice(state.prefix.length);
  });

  protected readonly dialogView = computed<TurnDialogView | null>(() => {
    const store = this.store();
    const state = store.state();
    if (!state) return null;
    const actor = store.currentPlayer();

    if (this.announceFirstPlayer() && !this.firstPlayerAcknowledged()) {
      const firstPlayer = actor?.name ?? this.text('dernierMot.game.firstPlayerFallback');
      const startingPerson = actor?.name ?? this.text('dernierMot.game.startingPersonFallback');
      const readyPlayer = actor?.name ?? this.text('dernierMot.game.playerFallback');
      return {
        kind: 'first-player',
        title: this.text('dernierMot.game.firstTitle', { name: firstPlayer }),
        message: this.text('dernierMot.game.firstMessage', { name: startingPerson }),
        primaryActionLabel: this.text('dernierMot.game.firstAction', { name: readyPlayer }),
      };
    }

    const resolution = state.resolution;
    if (!resolution) return null;
    const nextPlayer = store.playerAfterResult();
    const nextRoundStarter = state.players.find((player) => player.id === state.nextRoundStarterId);
    const scores = state.players;

    switch (resolution.kind) {
      case 'valid-prefix':
        return {
          kind: 'valid-prefix',
          title: this.text('dernierMot.game.validTitle'),
          message: this.continuationMessage(resolution.lookup.continuationCount),
          primaryActionLabel: this.text('dernierMot.game.passAction', {
            name: nextPlayer?.name ?? this.text('dernierMot.game.nextPersonFallback'),
          }),
        };
      case 'intermediate-word':
        return {
          kind: 'intermediate-word',
          title: this.text('dernierMot.game.intermediateTitle', { word: resolution.word }),
          message: this.text('dernierMot.game.intermediateMessage', {
            name: actor?.name ?? this.text('dernierMot.game.playerFallback'),
            continuations: this.continuationMessage(resolution.lookup.continuationCount),
          }),
          primaryActionLabel: this.text('dernierMot.game.passAction', {
            name: nextPlayer?.name ?? this.text('dernierMot.game.nextPersonFallback'),
          }),
          word: resolution.word,
          definitions: this.definitions().slice(0, 1),
        };
      case 'invalid-letter':
        return {
          kind: 'invalid-letter',
          title: this.text('dernierMot.game.invalidTitle', {
            attempt: resolution.attemptedPrefix,
          }),
          message: this.text('dernierMot.game.invalidMessage', {
            name: actor?.name ?? this.text('dernierMot.game.playerFallback'),
          }),
          primaryActionLabel:
            store.activePlayers().length === 1
              ? this.text('dernierMot.game.roundEndAction')
              : this.text('dernierMot.game.passAction', {
                  name: nextPlayer?.name ?? this.text('dernierMot.game.nextPersonFallback'),
                }),
          word: resolution.attemptedPrefix,
        };
      case 'elimination-round-end':
        if (state.phase === 'game-over') return this.gameOverView();
        return {
          kind: 'elimination-round-end',
          title: this.text('dernierMot.game.roundEndTitle'),
          message: this.text('dernierMot.game.roundEndMessage'),
          primaryActionLabel: this.text('dernierMot.game.nextRoundAction', {
            name: nextRoundStarter?.name ?? this.text('dernierMot.game.lastPlayerFallback'),
          }),
          completions: resolution.completions,
          players: scores,
          currentPlayerId: state.currentPlayerId,
        };
      case 'terminal-word': {
        const gameOver = state.phase === 'game-over';
        if (gameOver) return this.gameOverView();
        return {
          kind: 'terminal-word',
          title: this.text('dernierMot.game.terminalTitle'),
          message: this.text('dernierMot.game.terminalMessage', {
            name: actor?.name ?? this.text('dernierMot.game.playerFallback'),
            word: resolution.word,
          }),
          primaryActionLabel: this.text('dernierMot.game.nextRoundAction', {
            name: nextRoundStarter?.name ?? this.text('dernierMot.game.nextPlayerFallback'),
          }),
          word: resolution.word,
          definitions: this.definitions(),
          players: scores,
          currentPlayerId: '',
        };
      }
    }
  });

  /** La clé par variante force une nouvelle modale et donc une nouvelle annonce accessible. */
  protected readonly dialogViews = computed(() => {
    const view = this.dialogView();
    return view ? [view] : [];
  });

  constructor() {
    effect(() => {
      const resolution = this.store().state()?.resolution;
      const word =
        resolution?.kind === 'intermediate-word' || resolution?.kind === 'terminal-word'
          ? resolution.word
          : '';
      if (word === this.definitionWord) return;
      this.definitionWord = word;
      this.definitionExpanded.set(false);
      this.definitions.set([]);
      const request = ++this.definitionRequest;
      if (word === '') return;
      void this.dictionary()
        .definitions(word)
        .then((forms) => {
          if (request !== this.definitionRequest) return;
          const glosses = forms
            .flatMap((form) => form.glosses)
            .filter((gloss) => gloss.trim() !== '');
          this.definitions.set(
            glosses.length > 0 ? glosses : [this.text('dernierMot.game.missingDefinition')],
          );
        })
        .catch(() => {
          if (request === this.definitionRequest) {
            this.definitions.set([this.text('dernierMot.game.missingDefinition')]);
          }
        });
    });
  }

  protected handlePrimaryAction(): void {
    if (this.announceFirstPlayer() && !this.firstPlayerAcknowledged()) {
      this.firstPlayerAcknowledged.set(true);
      this.focusBoardAfterDialog();
      return;
    }

    const store = this.store();
    switch (store.state()?.phase) {
      case 'turn-result':
        store.acknowledgeResult();
        if (store.state()?.phase === 'turn') this.focusBoardAfterDialog();
        break;
      case 'round-result':
        store.startNextRound();
        this.focusBoardAfterDialog();
        break;
      case 'game-over':
        store.restart();
        this.restartRequested.emit();
        break;
    }
  }

  private gameOverView(): TurnDialogView {
    const store = this.store();
    const state = store.state();
    const winners = store.winners();
    const names = winners
      .map((winner) => winner.name)
      .join(this.text('dernierMot.game.winnerSeparator'));
    const score = Math.max(...winners.map((winner) => winner.score));
    const terminalWord =
      state?.resolution?.kind === 'terminal-word' ? state.resolution.word : undefined;
    const completions =
      state?.resolution?.kind === 'elimination-round-end'
        ? state.resolution.completions
        : undefined;
    return {
      kind: 'game-over',
      title: this.text(
        winners.length > 1
          ? 'dernierMot.game.gameOverTitleMany'
          : 'dernierMot.game.gameOverTitleOne',
        { names },
      ),
      message: this.text(
        winners.length > 1
          ? 'dernierMot.game.gameOverMessageMany'
          : 'dernierMot.game.gameOverMessageOne',
        { score },
      ),
      primaryActionLabel: this.text('dernierMot.game.restart'),
      word: terminalWord,
      definitions: terminalWord ? this.definitions() : undefined,
      completions,
      players: state?.players ?? [],
      currentPlayerId: '',
      winnerIds: state?.winners ?? [],
    };
  }

  private focusBoardAfterDialog(): void {
    setTimeout(() => this.board()?.nativeElement.focus());
  }

  private continuationMessage(count: number): string {
    return this.text(
      count === 1 ? 'dernierMot.game.continuationOne' : 'dernierMot.game.continuationMany',
      { count },
    );
  }

  protected text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
