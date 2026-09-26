import { computed, Injectable, signal } from '@angular/core';
import { createCatalog, type Catalog } from '../domain/catalog';
import { createGame, reduceGame, type Action, type GameState } from '../domain/game';
import type { Country } from '../domain/types';

@Injectable()
export class QuizStore {
  private readonly game = signal<GameState | null>(null);
  private readonly answers = signal<Catalog | null>(null);
  readonly state = this.game.asReadonly();
  readonly catalog = this.answers.asReadonly();
  readonly question = computed(() => {
    const state = this.state();
    return state?.questions[state.index] ?? null;
  });
  readonly domain = computed(() => {
    const q = this.question();
    return q ? this.catalog()![q.answerType] : [];
  });
  readonly correctLabels = computed(() =>
    this.domain()
      .filter((a) => this.question()!.correctAnswers.includes(a.id))
      .map((a) => a.label),
  );

  start(countries?: readonly Country[]): void {
    if (countries) this.answers.set(createCatalog(countries));
    const catalog = this.catalog();
    if (catalog) this.game.set(createGame(catalog, Math.random));
  }
  dispatch(action: Action): void {
    const state = this.state(),
      catalog = this.catalog();
    if (state && catalog) this.game.set(reduceGame(state, action, catalog));
  }
}
