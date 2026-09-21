import { TestBed } from '@angular/core/testing';
import { StorageService } from '@lets-ple/game-core';
import { createGame, reduce } from '../domain/game';
import { GameStore } from '../store/game.store';
import {
  CryptogrammePersistenceService,
  type SavedCryptogramme,
} from './cryptogramme-persistence.service';

describe('CryptogrammePersistenceService', () => {
  let service: CryptogrammePersistenceService;
  let storage: StorageService;
  const key = 'cryptogramme:activeGame';
  const fixture = (): SavedCryptogramme => {
    let state = createGame('q', 'BBBB!', { seed: 'persist', givenCount: 0 });
    state = reduce(state, { type: 'DRAW' });
    state = reduce(state, { type: 'SELECT_CELL', index: 0 });
    state = reduce(state, { type: 'PLAY' });
    state = reduce(state, { type: 'DRAW' });
    state = reduce(state, { type: 'SELECT_CELL', index: 2 });
    return { state, author: 'Auteur', source: 'Livre', minLetters: 2, maxLetters: 100 };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    storage = TestBed.inject(StorageService);
    service = TestBed.inject(CryptogrammePersistenceService);
    service.clear();
  });
  afterEach(() => service.clear());

  it('restaure exactement cartes, correspondances, sélection et filtres', () => {
    const game = fixture();
    service.save(game);
    expect(service.load()).toEqual(game);
    expect(service.load()!.state.known).toBeInstanceOf(Map);
    const restored = service.load()!.state;
    const store = new GameStore(
      restored.puzzle.quoteId,
      restored.puzzle.text,
      { seed: 'unused' },
      restored,
    );
    expect(store.state()).toEqual(game.state);
    store.play();
    expect(store.state().board[2]).toMatchObject({ filled: 'B' });
    expect(store.state().hand).toHaveLength(0);
  });

  it.each(['distinct', 'merged'] as const)(
    'restaure les accents %s et les cadeaux initiaux',
    (accentMode) => {
      const game = {
        ...fixture(),
        state: createGame('accent', 'Élève, où êtes-vous ? À côté.', {
          seed: 'accent',
          accentMode,
        }),
      };
      service.save(game);
      expect(service.load()).toEqual(game);
    },
  );

  it('restaure les erreurs et une partie perdue', () => {
    let state = createGame('lost', 'BCDFG BCDFG', { seed: 'lost' });
    state = reduce(state, { type: 'DRAW' });
    const wrong = state.board.findIndex(
      (cell, index) =>
        cell.kind === 'letter' &&
        cell.filled === null &&
        state.puzzle.solution[index] !== state.hand[0],
    );
    for (let i = 0; i < 3; i++) {
      state = reduce(reduce(state, { type: 'SELECT_CELL', index: wrong }), { type: 'PLAY' });
    }
    expect(state.status).toBe('lost');
    const game = { ...fixture(), state };
    service.save(game);
    expect(service.load()).toEqual(game);
  });

  it.each([
    'unknownVersion',
    'wrongSolution',
    'missingCard',
    'wrongKnown',
    'invalidSelection',
    'wrongStatus',
  ])('ignore une sauvegarde invalide : %s', (corruption) => {
    service.save(fixture());
    const raw = storage.read<any>(key, null);
    if (corruption === 'unknownVersion') raw.version = 999;
    if (corruption === 'wrongSolution') raw.state.puzzle.solution[1] = 'A';
    if (corruption === 'missingCard') raw.state.deck.pop();
    if (corruption === 'wrongKnown') raw.state.known[0][1] = 'A';
    if (corruption === 'invalidSelection') raw.state.selectedCell = 400;
    if (corruption === 'wrongStatus') raw.state.status = 'won';
    storage.write(key, raw);
    expect(service.load()).toBeNull();
  });

  it('conserve la partie lorsque les filtres en cours de saisie sont invalides', () => {
    const game = fixture();
    service.save({ ...game, minLetters: 1000, maxLetters: 2 });
    expect(service.load()).toEqual({ ...game, minLetters: null, maxLetters: null });
    service.save({ ...game, minLetters: -1 });
    expect(service.load()).toEqual({ ...game, minLetters: null });
    service.save({ ...game, minLetters: 0 });
    expect(service.load()).toEqual({ ...game, minLetters: null });
  });

  it('accepte les parties terminées et permet de supprimer la sauvegarde', () => {
    const game = fixture();
    service.save({ ...game, state: reduce(game.state, { type: 'COMPLETE' }) });
    expect(service.load()!.state.status).toBe('won');
    service.clear();
    expect(service.load()).toBeNull();
  });

  it('ne bloque pas le jeu si le stockage devient indisponible', () => {
    vi.spyOn(storage, 'read').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(storage, 'write').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(storage, 'remove').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(service.load()).toBeNull();
    expect(() => service.save(fixture())).not.toThrow();
    expect(() => service.clear()).not.toThrow();
  });
});
