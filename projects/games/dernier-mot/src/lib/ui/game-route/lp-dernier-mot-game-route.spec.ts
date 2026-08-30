import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageService } from '@lets-ple/game-core';
import { DictionaryService } from '../../dictionary/dictionary.service';
import type { DefinitionForm } from '../../dictionary/serialized-dictionary';
import { createMemoryDictionary } from '../../domain/dictionary';
import { LpDernierMotGameRoute } from './lp-dernier-mot-game-route';

const manifestFixture = {
  schemaVersion: 1 as const,
  generatedAt: '2026-08-29T22:58:00.000Z',
  entryCount: 47_920,
  sources: [
    {
      name: 'Lexique 4' as const,
      url: 'https://lexique.org/databases/Lexique400/Lexique400.tsv',
      retrievedAt: '2026-08-29T22:57:34.000Z',
      license: 'CC-BY-SA-4.0' as const,
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      creators: ['Boris New', 'Christophe Pallier'],
      sha256: 'fe333b4f9e1797f23922d5863cde28635ee13685813af0f9b4b4b9f7d4610a5a',
    },
    {
      name: 'Wiktionnaire' as const,
      url: 'https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz',
      retrievedAt: '2026-08-29T22:58:00.000Z',
      license: 'CC-BY-SA-4.0' as const,
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      creators: ['Contributeurs du Wiktionnaire en français'],
      sha256: 'f7c1756aa2e07b21e255d154f9ec9b51a1d8da126896b22dc7ac5873efa17c05',
    },
  ],
  adaptation: {
    license: 'CC-BY-SA-4.0' as const,
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    notice: 'Corpus dérivé : sélection de lemmes et construction d’un index de préfixes.',
  },
};

describe('LpDernierMotGameRoute', () => {
  beforeAll(installDialogPolyfill);

  beforeEach(() => localStorage.clear());

  it('propose Réessayer lorsque le dictionnaire ne charge pas', async () => {
    let attempts = 0;
    const dictionary = fakeDictionary(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('hors ligne');
    });
    configure(dictionary);
    const fixture = TestBed.createComponent(LpDernierMotGameRoute);
    await renderAsync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Impossible de charger le dictionnaire');
    const retry = fixture.nativeElement.querySelector('[data-retry]') as HTMLButtonElement;
    expect(retry.textContent).toContain('Réessayer');

    retry.click();
    await renderAsync(fixture);

    expect(attempts).toBe(2);
    expect(fixture.nativeElement.querySelector('lp-dernier-mot-setup-page')).not.toBeNull();
  });

  it('bloque le jeu et permet de réessayer lorsque le manifeste ne charge pas', async () => {
    let attempts = 0;
    const dictionary = fakeDictionary(['CHA', 'CHAT', 'CHATON'], async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('attribution indisponible');
      return manifestFixture;
    });
    configure(dictionary);
    const fixture = TestBed.createComponent(LpDernierMotGameRoute);
    await renderAsync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Impossible de charger le dictionnaire');
    expect(fixture.nativeElement.querySelector('[data-player-name]')).toBeNull();

    (fixture.nativeElement.querySelector('[data-retry]') as HTMLButtonElement).click();
    await renderAsync(fixture);

    expect(attempts).toBe(2);
    expect(fixture.nativeElement.querySelector('[data-player-name]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Lexique 4');
  });

  it('démarre une partie et annonce le joueur tiré au sort', async () => {
    configure(fakeDictionary());
    const fixture = TestBed.createComponent(LpDernierMotGameRoute);
    await renderAsync(fixture);

    submitPlayers(fixture, ['Alice', 'Basile']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('lp-dernier-mot-game-page')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toMatch(/(Alice|Basile) commence/);
  });

  it('une nouvelle instance reprend le même joueur depuis StorageService', async () => {
    const dictionary = fakeDictionary();
    configure(dictionary);
    const first = TestBed.createComponent(LpDernierMotGameRoute);
    await renderAsync(first);
    submitPlayers(first, ['Alice', 'Basile']);
    first.detectChanges();
    (first.nativeElement.querySelector('[data-primary-action]') as HTMLButtonElement).click();
    first.detectChanges();
    (first.nativeElement.querySelector('[data-letter="C"]') as HTMLButtonElement).click();
    first.detectChanges();
    (first.nativeElement.querySelector('[data-primary-action]') as HTMLButtonElement).click();
    first.detectChanges();
    const expectedCurrent = currentPlayerName(first.nativeElement);
    first.destroy();

    const resumed = TestBed.createComponent(LpDernierMotGameRoute);
    await renderAsync(resumed);

    expect(resumed.nativeElement.querySelector('lp-dernier-mot-setup-page')).toBeNull();
    expect(currentPlayerName(resumed.nativeElement)).toBe(expectedCurrent);
    expect(resumed.nativeElement.textContent).not.toContain('commence');
  });

  it('Refaire une partie efface la sauvegarde et revient au setup', async () => {
    const dictionary = fakeDictionary(['A']);
    configure(dictionary);
    const storage = TestBed.inject(StorageService);
    const state = {
      version: 1,
      players: [
        { id: 'player-0', name: 'Alice', score: 12, active: true },
        { id: 'player-1', name: 'Basile', score: 9, active: true },
      ],
      round: 4,
      prefix: 'A',
      currentPlayerId: 'player-0',
      nextRoundStarterId: 'player-1',
      phase: 'game-over',
      resolution: { kind: 'terminal-word', word: 'A', points: 3 },
      winners: ['player-0'],
    } as const;
    storage.write('dernierMot:activeMatch', state);
    const fixture = TestBed.createComponent(LpDernierMotGameRoute);
    await renderAsync(fixture);

    (fixture.nativeElement.querySelector('[data-primary-action]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(storage.read('dernierMot:activeMatch', null)).toBeNull();
    expect(fixture.nativeElement.querySelector('lp-dernier-mot-setup-page')).not.toBeNull();
  });
});

function configure(dictionary: ReturnType<typeof fakeDictionary>): void {
  TestBed.configureTestingModule({
    providers: [{ provide: DictionaryService, useValue: dictionary }],
  });
}

function fakeDictionary(
  wordsOrLoad: readonly string[] | (() => Promise<void>) = ['CHA', 'CHAT', 'CHATON'],
  manifest = async () => manifestFixture,
) {
  const words = Array.isArray(wordsOrLoad) ? wordsOrLoad : ['CHA', 'CHAT', 'CHATON'];
  const memory = createMemoryDictionary(words);
  const load = typeof wordsOrLoad === 'function' ? wordsOrLoad : async () => undefined;
  return {
    load,
    manifest,
    lookup: memory.lookup,
    completions: memory.completions,
    definitions: async (): Promise<readonly DefinitionForm[]> => [],
  };
}

async function renderAsync(fixture: ComponentFixture<LpDernierMotGameRoute>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
}

function submitPlayers(
  fixture: ComponentFixture<LpDernierMotGameRoute>,
  names: readonly string[],
): void {
  const root = fixture.nativeElement as HTMLElement;
  for (const [index, name] of names.entries()) {
    const input = root.querySelector('[data-player-name]') as HTMLInputElement;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    if (index < names.length - 1) {
      (root.querySelector('[data-add-player]') as HTMLButtonElement).click();
      fixture.detectChanges();
    }
  }
  (root.querySelector('[data-start-game]') as HTMLButtonElement).click();
}

function currentPlayerName(root: HTMLElement): string {
  return (
    root
      .querySelector('[aria-current="true"] .dernier-mot-score-name')
      ?.firstChild?.textContent?.trim() ?? ''
  );
}

function installDialogPolyfill(): void {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
