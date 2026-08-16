import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LpGamePage } from '../game-page/lp-game-page';
import { QuoteService } from '../../quotes/quote.service';
import { pickRandomQuote } from '../../quotes/pick-random-quote';
import type { Quote } from '../../quotes/quote';

/**
 * Point d'entrée routé du jeu (voir `routes.ts`) : résout une citation au hasard dans le corpus,
 * puis délègue tout le reste — plateau, main, règles — à `LpGamePage`, agnostique de cette
 * résolution. `LpGamePage` reste donc pilotable par inputs explicites dans le showcase de
 * composants.
 */
@Component({
  selector: 'lp-game-route',
  imports: [LpGamePage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (quote(); as q) {
      <lp-game-page
        [quoteId]="q.id"
        [text]="q.text"
        [author]="q.author"
        [source]="q.source"
        [seed]="seed"
      />
    }
  `,
})
export class LpGameRoute {
  private readonly quoteService = inject(QuoteService);

  protected readonly quote = signal<Quote | null>(null);
  protected readonly seed = crypto.randomUUID();

  constructor() {
    this.quoteService.loadTheme('litterature').subscribe((quotes) => {
      this.quote.set(pickRandomQuote(quotes));
    });
  }
}
