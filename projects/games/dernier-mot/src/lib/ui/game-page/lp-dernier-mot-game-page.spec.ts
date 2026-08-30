import { TestBed } from '@angular/core/testing';
import { StorageService } from '@lets-ple/game-core';
import type { DictionaryPort, PrefixLookup } from '../../domain/dictionary';
import { createMemoryDictionary } from '../../domain/dictionary';
import type { GameState } from '../../domain/game';
import type { DefinitionForm } from '../../dictionary/serialized-dictionary';
import { DernierMotGameStore } from '../../store/game.store';
import { LpDernierMotGamePage } from './lp-dernier-mot-game-page';

interface TestDictionary extends DictionaryPort {
  definitions(word: string): Promise<readonly DefinitionForm[]>;
}

describe('LpDernierMotGamePage', () => {
  beforeAll(installDialogPolyfill);

  beforeEach(() => localStorage.clear());

  it('annonce le joueur tiré au sort en gardant le plateau monté', () => {
    const { fixture, store } = createPage(['CHA', 'CHAT'], true);
    const starter = store.currentPlayer()?.name;

    expect(fixture.nativeElement.textContent).toContain(`${starter} commence`);
    expectBoardToStayMounted(fixture.nativeElement);
  });

  it('garde le plateau stable et le clavier inaccessible sous chaque résultat', async () => {
    const { fixture } = createPage(['CHA', 'CHAT']);

    letterButton(fixture.nativeElement, 'C').click();
    fixture.detectChanges();

    expectBoardToStayMounted(fixture.nativeElement);
    expect(letterButton(fixture.nativeElement, 'A').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('montre la lettre invalide puis conserve le préfixe accepté', () => {
    const { fixture, store } = createPage(['CHA']);

    letterButton(fixture.nativeElement, 'C').click();
    fixture.detectChanges();
    primaryButton(fixture.nativeElement).click();
    fixture.detectChanges();
    letterButton(fixture.nativeElement, 'X').click();
    fixture.detectChanges();

    expect(store.state()?.prefix).toBe('C');
    expect(fixture.nativeElement.querySelector('[data-turn-word]')?.textContent.trim()).toBe('CX');
    expect(fixture.nativeElement.querySelector('.is-attempted')?.textContent).toContain('X');
  });

  it('limite le mot intermédiaire à une définition courte', async () => {
    const dictionary = testDictionary(['CHA', 'CHAT', 'CHATON'], {
      CHAT: [
        {
          spelling: 'chat',
          glosses: ['Petit félin domestique.', 'Conversation textuelle en ligne.'],
        },
      ],
    });
    const { fixture, store } = createPageWithDictionary(dictionary, false, ['Alice', 'Basile']);
    playAcceptedWord(store, 'CHAT');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[data-definition-toggle]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[data-definitions]')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    const definitions = fixture.nativeElement.querySelectorAll('[data-definitions] p');
    expect(definitions).toHaveLength(1);
    expect(definitions[0].textContent).toContain('Petit félin domestique.');
  });

  it('affiche Définition indisponible sans modifier le résultat', async () => {
    const dictionary = testDictionary(['CHA', 'CHAT', 'CHATON']);
    const { fixture, store } = createPageWithDictionary(dictionary);
    playAcceptedWord(store, 'CHAT');
    const score = store.currentPlayer()?.score;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-definition-toggle]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Définition indisponible');
    expect(store.state()?.resolution?.kind).toBe('intermediate-word');
    expect(store.currentPlayer()?.score).toBe(score);
  });

  it('demande au plus cinq complétions et affiche le tableau des scores en fin de manche', () => {
    const completionCalls: number[] = [];
    const dictionary = testDictionary(['CA', 'CAB', 'CABANE', 'CABAS', 'CAGE', 'CAHIER', 'CALME']);
    const originalCompletions = dictionary.completions.bind(dictionary);
    dictionary.completions = (prefix, limit) => {
      completionCalls.push(limit);
      return originalCompletions(prefix, limit);
    };
    const { fixture, store } = createPageWithDictionary(dictionary, false, ['Alice', 'Basile']);

    store.playLetter('C');
    store.acknowledgeResult();
    store.playLetter('X');
    store.acknowledgeResult();
    fixture.detectChanges();

    expect(completionCalls).toEqual([5]);
    expect(fixture.nativeElement.querySelectorAll('.dernier-mot-completions li')).toHaveLength(5);
    expect(
      fixture.nativeElement.querySelectorAll('lp-turn-dialog [data-score-player]'),
    ).toHaveLength(2);
  });

  it('nomme le prochain joueur dans l’action principale', () => {
    const { fixture, store } = createPage(['CHA', 'CHAT']);
    const actor = store.currentPlayer()?.id;

    letterButton(fixture.nativeElement, 'C').click();
    fixture.detectChanges();

    const expected = store.state()?.players.find((player) => player.id !== actor)?.name;
    expect(primaryButton(fixture.nativeElement).textContent).toContain(`Passer à ${expected}`);
  });

  it('rend le focus au plateau après la fermeture native différée du dialogue', async () => {
    const { fixture } = createPage(['CHA', 'CHAT']);
    const key = letterButton(fixture.nativeElement, 'C');
    const browserFallback = document.createElement('button');
    document.body.append(browserFallback);
    key.focus();
    key.click();
    fixture.detectChanges();

    primaryButton(fixture.nativeElement).click();
    fixture.detectChanges();
    queueMicrotask(() => browserFallback.focus());
    await new Promise((resolve) => setTimeout(resolve));

    const activeElement = document.activeElement;
    browserFallback.remove();
    expect(activeElement).toBe(fixture.nativeElement.querySelector('[data-game-board]'));
  });

  it('affiche le mot, sa définition et les scores finaux sans passage', async () => {
    const dictionary = testDictionary(['A'], {
      A: [{ spelling: 'a', glosses: ['Première lettre de l’alphabet.'] }],
    });
    const { fixture, store } = createPageWithDictionary(dictionary, false, ['Alice', 'Basile']);
    for (let round = 0; round < 7; round += 1) {
      store.playLetter('A');
      if (round < 6) store.startNextRound();
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const action = primaryButton(fixture.nativeElement);
    expect(store.state()?.phase).toBe('game-over');
    expect(fixture.nativeElement.querySelector('[data-turn-word]')?.textContent.trim()).toBe('A');
    expect(fixture.nativeElement.textContent).toContain('Première lettre de l’alphabet.');
    expect(action.textContent).toContain('Refaire une partie');
    expect(action.textContent).not.toContain('Passer à');
    expect(
      fixture.nativeElement.querySelectorAll('lp-turn-dialog [data-score-player]'),
    ).toHaveLength(2);
  });

  it('affiche les gagnants ex æquo et Refaire une partie après une fin par élimination', () => {
    const dictionary = testDictionary(['CA']);
    const { fixture, store } = createResumedPage(dictionary, {
      version: 1,
      players: [
        { id: 'player-0', name: 'Alice', score: 13, active: true },
        { id: 'player-1', name: 'Basile', score: 12, active: true },
      ],
      round: 5,
      prefix: 'C',
      currentPlayerId: 'player-0',
      nextRoundStarterId: 'player-0',
      phase: 'turn',
      resolution: null,
      winners: [],
    });

    letterButton(fixture.nativeElement, 'X').click();
    fixture.detectChanges();
    primaryButton(fixture.nativeElement).click();
    fixture.detectChanges();

    const action = primaryButton(fixture.nativeElement);
    expect(store.state()?.phase).toBe('game-over');
    expect(fixture.nativeElement.textContent).toContain('Alice et Basile gagnent');
    expect(fixture.nativeElement.textContent).toContain('Victoire ex æquo avec 12 points');
    expect(fixture.nativeElement.textContent).toContain('Des mots restaient possibles');
    expect(fixture.nativeElement.textContent).toContain('CA');
    expect(
      fixture.nativeElement.querySelectorAll('lp-turn-dialog [data-winner="true"]'),
    ).toHaveLength(2);
    expect(action.textContent).toContain('Refaire une partie');
    expect(action.textContent).not.toMatch(/Passer à|manche suivante/);

    const restarted: void[] = [];
    fixture.componentInstance.restartRequested.subscribe(() => restarted.push(undefined));
    action.click();
    fixture.detectChanges();

    expect(store.state()).toBeNull();
    expect(restarted).toHaveLength(1);
  });

  it('ne désigne plus l’auteur comme joueur courant dans une fin terminale non finale', () => {
    const { fixture, store } = createPageWithDictionary(testDictionary(['A']), false, [
      'Alice',
      'Basile',
    ]);

    store.playLetter('A');
    fixture.detectChanges();

    expect(store.state()?.phase).toBe('round-result');
    expect(fixture.nativeElement.querySelector('lp-turn-dialog [aria-current="true"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('lp-turn-dialog')?.textContent).not.toContain(
      'À son tour',
    );
  });

  it('décrit exactement la pénalité invalide lorsque le score reste à zéro', () => {
    const { fixture, store } = createPageWithDictionary(testDictionary(['CA']), false, [
      'Alice',
      'Basile',
    ]);

    letterButton(fixture.nativeElement, 'X').click();
    fixture.detectChanges();

    expect(store.currentPlayer()?.score).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('perd 1 point');
    expect(fixture.nativeElement.textContent).toContain('score ne peut pas descendre sous 0');
  });

  it('n’annonce pas le joueur éliminé comme étant encore à son tour', () => {
    const { fixture, store } = createPage(['CHA', 'CHAT']);
    const eliminatedName = store.currentPlayer()?.name;

    letterButton(fixture.nativeElement, 'Z').click();
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('.dernier-mot-game-heading');
    expect(heading.textContent).not.toContain(`À ${eliminatedName} de jouer`);
    expect(heading.textContent).toContain('Tour terminé');
  });

  it('remonte une nouvelle modale annoncée et focalisée pour la fin par élimination', () => {
    const { fixture } = createPageWithDictionary(testDictionary(['CA']), false, [
      'Alice',
      'Basile',
    ]);

    letterButton(fixture.nativeElement, 'X').click();
    fixture.detectChanges();
    const invalidDialog = fixture.nativeElement.querySelector('dialog');

    primaryButton(fixture.nativeElement).click();
    fixture.detectChanges();
    const roundEndDialog = fixture.nativeElement.querySelector('dialog');

    expect(roundEndDialog).not.toBe(invalidDialog);
    expect(roundEndDialog?.hasAttribute('open')).toBe(true);
    expect(roundEndDialog?.querySelector('h2')?.textContent).toContain('Fin de la manche');
    expect(document.activeElement).toBe(primaryButton(fixture.nativeElement));
  });
});

function createPage(words: readonly string[], announceFirstPlayer = false) {
  return createPageWithDictionary(testDictionary(words), announceFirstPlayer);
}

function createPageWithDictionary(
  dictionary: TestDictionary,
  announceFirstPlayer = false,
  names: readonly string[] = ['Alice', 'Basile', 'Chloé', 'Dario'],
) {
  const store = DernierMotGameStore.create(
    names,
    dictionary,
    TestBed.inject(StorageService),
    'task-9-seed',
  );
  const fixture = TestBed.createComponent(LpDernierMotGamePage);
  fixture.componentRef.setInput('store', store);
  fixture.componentRef.setInput('dictionary', dictionary);
  fixture.componentRef.setInput('announceFirstPlayer', announceFirstPlayer);
  fixture.detectChanges();
  return { fixture, store };
}

function createResumedPage(dictionary: TestDictionary, state: GameState) {
  const storage = TestBed.inject(StorageService);
  storage.write('dernierMot:activeMatch', state);
  const store = DernierMotGameStore.resume(dictionary, storage);
  const fixture = TestBed.createComponent(LpDernierMotGamePage);
  fixture.componentRef.setInput('store', store);
  fixture.componentRef.setInput('dictionary', dictionary);
  fixture.detectChanges();
  return { fixture, store };
}

function testDictionary(
  words: readonly string[],
  definitions: Readonly<Record<string, readonly DefinitionForm[]>> = {},
): TestDictionary {
  const memory = createMemoryDictionary(words);
  return {
    lookup: (prefix: string): PrefixLookup => memory.lookup(prefix),
    completions: (prefix: string, limit: number) => memory.completions(prefix, limit),
    definitions: async (word: string) => definitions[word] ?? [],
  };
}

function playAcceptedWord(store: DernierMotGameStore, word: string): void {
  for (const letter of word) {
    store.playLetter(letter);
    if (store.state()?.phase === 'turn-result' && store.state()?.prefix !== word) {
      store.acknowledgeResult();
    }
  }
}

function letterButton(root: HTMLElement, letter: string): HTMLButtonElement {
  return root.querySelector(`[data-letter="${letter}"]`) as HTMLButtonElement;
}

function primaryButton(root: HTMLElement): HTMLButtonElement {
  return root.querySelector('[data-primary-action]') as HTMLButtonElement;
}

function expectBoardToStayMounted(root: HTMLElement): void {
  expect(root.querySelector('lp-scoreboard')).not.toBeNull();
  expect(root.querySelector('lp-word-progress')).not.toBeNull();
  expect(root.querySelector('lp-letter-keyboard')).not.toBeNull();
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
