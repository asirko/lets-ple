import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LpButton, LpPanel } from '@lets-ple/ui';
import { toSymbols } from '../../domain/alphabet';
import { LpGamePage } from '../game-page/lp-game-page';
import { QuoteService } from '../../quotes/quote.service';
import { pickRandomQuote } from '../../quotes/pick-random-quote';
import type { Quote } from '../../quotes/quote';
import type { GameState } from '../../domain/game';
import { CryptogrammePersistenceService } from '../../persistence/cryptogramme-persistence.service';

/**
 * Point d'entrée routé du jeu (voir `routes.ts`) : résout une citation au hasard dans le corpus,
 * puis délègue tout le reste — plateau, main, règles — à `LpGamePage`, agnostique de cette
 * résolution. `LpGamePage` reste donc pilotable par inputs explicites dans le showcase de
 * composants.
 */
@Component({
  selector: 'lp-game-route',
  imports: [LpGamePage, LpButton, LpPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (quote(); as q) {
      @if (loadError(); as error) {
        <lp-panel padding="md">
          <p role="alert">{{ error }} Votre partie sauvegardée reste disponible.</p>
          <lp-button (click)="loadQuotes()">Réessayer le chargement</lp-button>
        </lp-panel>
      }
      <lp-game-page
        [quoteId]="q.id"
        [text]="q.text"
        [author]="q.author"
        [source]="q.source"
        [seed]="seed()"
        [minLetters]="minLetters()"
        [maxLetters]="maxLetters()"
        [filterError]="filterError()"
        [minAvailable]="minAvailable()"
        [maxAvailable]="maxAvailable()"
        [initialState]="initialState()"
        (stateChange)="saveState($event)"
        (minLettersChange)="minLetters.set($event); filtersChanged()"
        (maxLettersChange)="maxLetters.set($event); filtersChanged()"
        (newGame)="newGame()"
      />
    } @else {
      <lp-panel padding="md">
        @if (loadError(); as error) {
          <p role="alert">{{ error }}</p>
          <lp-button (click)="loadQuotes()">Réessayer</lp-button>
        } @else {
          <p role="status">Chargement de la citation…</p>
        }
      </lp-panel>
    }
  `,
})
export class LpGameRoute {
  private readonly quoteService = inject(QuoteService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly persistence = inject(CryptogrammePersistenceService);
  private lastState: GameState | undefined;
  private quotes: readonly { quote: Quote; letters: number }[] = [];

  protected readonly quote = signal<Pick<Quote, 'id' | 'text' | 'author' | 'source'> | null>(null);
  protected readonly initialState = signal<GameState | undefined>(undefined);
  protected readonly minAvailable = signal(1);
  protected readonly maxAvailable = signal(500);
  protected readonly seed = signal<string>(crypto.randomUUID());
  protected readonly minLetters = signal<number | null>(null);
  protected readonly maxLetters = signal<number | null>(null);
  protected readonly filterError = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);

  constructor() {
    const saved = this.persistence.load();
    if (saved) {
      this.initialState.set(saved.state);
      this.lastState = saved.state;
      this.quote.set({ id: saved.state.puzzle.quoteId, text: saved.state.puzzle.text, author: saved.author, source: saved.source });
      this.seed.set(saved.state.puzzle.seed);
      this.minLetters.set(saved.minLetters);
      this.maxLetters.set(saved.maxLetters);
    }
    this.loadQuotes();
  }

  protected loadQuotes(): void {
    this.loadError.set(null);
    this.quoteService.loadTheme('litterature').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (quotes) => {
        this.quotes = quotes.map((quote) => ({
          quote,
          letters: toSymbols(quote.text, 'distinct').filter((symbol) => symbol !== null).length,
        }));
        if (this.quotes.length) {
          this.minAvailable.set(Math.min(...this.quotes.map((entry) => entry.letters)));
          this.maxAvailable.set(Math.max(...this.quotes.map((entry) => entry.letters)));
        }
        if (quotes.length === 0) {
          this.loadError.set('Aucune citation disponible. Réessayez dans un instant.');
          return;
        }
        if (!this.quote()) this.quote.set(pickRandomQuote(quotes));
      },
      error: () => this.loadError.set('Impossible de charger les citations. Vérifiez votre connexion puis réessayez.'),
    });
  }

  protected newGame(): void {
    if (this.quotes.length === 0) {
      this.filterError.set(this.loadError()
        ? 'Le catalogue est indisponible. Réessayez son chargement pour changer de citation.'
        : 'Le catalogue est en cours de chargement. Vous pouvez continuer votre partie.');
      return;
    }
    const min = this.minLetters();
    const max = this.maxLetters();
    if ([min, max].some((value) => value !== null && (!Number.isInteger(value) || value < 1))) {
      this.filterError.set('Saisissez des nombres entiers supérieurs à zéro, ou laissez les champs vides.');
      return;
    }
    if (min !== null && max !== null && min > max) {
      this.filterError.set('Le minimum doit être inférieur ou égal au maximum.');
      return;
    }
    const matching = this.quotes.filter(({ letters }) =>
      (min === null || letters >= min) && (max === null || letters <= max),
    );
    const alternatives = matching.filter(({ quote }) => quote.id !== this.quote()?.id);
    if (alternatives.length === 0) {
      this.filterError.set(matching.length === 0
        ? 'Aucune citation ne correspond à ces filtres. Élargissez les limites pour commencer une nouvelle partie.'
        : 'Seule la citation actuelle correspond à ces filtres. Élargissez les limites ou recommencez cette citation.');
      return;
    }
    this.filterError.set(null);
    this.initialState.set(undefined);
    this.quote.set(pickRandomQuote(alternatives).quote);
    this.seed.set(crypto.randomUUID());
  }

  protected saveState(state: GameState): void {
    this.lastState = state;
    const quote = this.quote();
    if (quote) this.persistence.save({ state, author: quote.author, source: quote.source, minLetters: this.minLetters(), maxLetters: this.maxLetters() });
  }

  protected filtersChanged(): void {
    this.filterError.set(null);
    if (this.lastState) this.saveState(this.lastState);
  }
}
