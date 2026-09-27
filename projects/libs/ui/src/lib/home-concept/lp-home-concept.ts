import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export interface HomeGame {
  id: string;
  title: string;
  summary: string;
  route: string;
  themes?: readonly string[];
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

@Component({
  selector: 'lp-home-concept',
  templateUrl: './lp-home-concept.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LpHomeConcept {
  readonly games = input<readonly HomeGame[]>([]);
  readonly query = model('');
  private readonly indexedGames = computed(() =>
    this.games().map((game) => ({
      game,
      text: normalizeSearch(
        [
          game.title,
          game.summary,
          ...(game.themes ?? []),
          game.themes?.includes('multi') ? 'à plusieurs' : 'en solo',
        ].join(' '),
      ),
    })),
  );
  readonly filteredGames = computed(() => {
    const terms = normalizeSearch(this.query()).trim().split(/\s+/).filter(Boolean);
    return this.indexedGames()
      .filter(({ text }) => terms.every((term) => text.includes(term)))
      .map(({ game }) => game);
  });

  clearSearch(field: HTMLInputElement): void {
    this.query.set('');
    field.focus();
  }

  skipToGames(event: Event, section: HTMLElement): void {
    event.preventDefault();
    section.focus();
  }
}
