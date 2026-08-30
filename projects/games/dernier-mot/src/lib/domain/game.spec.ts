import { describe, expect, it } from 'vitest';
import { createMemoryDictionary } from './dictionary';
import {
  createMatch,
  reduce,
  restoreMatch,
  settleRound,
  type GameState,
  type PlayerState,
} from './game';

const dictionary = createMemoryDictionary(['CHA', 'CHAT', 'CHATON', 'CHIEN', 'CHIC', 'CHOC']);

function match(seed = 'partie-42') {
  return createMatch(['Alice', 'Benoit', 'Chloe'], dictionary, seed);
}

function play(state: GameState, letter: string): GameState {
  return reduce(state, { type: 'PLAY_LETTER', letter }, dictionary);
}

function acknowledge(state: GameState): GameState {
  return reduce(state, { type: 'ACKNOWLEDGE_RESULT' }, dictionary);
}

function player(id: string, score: number): PlayerState {
  return { id, name: id, score, active: true };
}

function stateAtRoundEnd(players: readonly PlayerState[]): GameState {
  return {
    version: 1,
    players,
    round: 1,
    prefix: 'CHAT',
    currentPlayerId: players[0].id,
    nextRoundStarterId: players[1].id,
    phase: 'round-result',
    resolution: { kind: 'terminal-word', word: 'CHAT', points: 3 },
    winners: [],
  };
}

describe('createMatch', () => {
  it('préserve l’ordre de saisie et choisit un premier joueur déterministe', () => {
    const first = match();
    const second = match();

    expect(first.players.map((player) => player.name)).toEqual(['Alice', 'Benoit', 'Chloe']);
    expect(first.currentPlayerId).toBe(second.currentPlayerId);
    expect(first.players.map((player) => player.id)).toEqual(['player-0', 'player-1', 'player-2']);
  });

  it.each([
    ['Alice', ' '],
    ['Alice', ' alice '],
  ])('refuse les pseudonymes vides ou dupliqués sans tenir compte de la casse', (...names) => {
    expect(() => createMatch(names, dictionary, 'partie-42')).toThrow(RangeError);
  });
});

describe('reduce', () => {
  it('accepte un préfixe légal sans modifier le score', () => {
    const result = play(match(), 'c');

    expect(result).toMatchObject({
      prefix: 'C',
      phase: 'turn-result',
      resolution: { kind: 'valid-prefix' },
    });
    expect(result.players.find((player) => player.id === result.currentPlayerId)?.score).toBe(0);
  });

  it('accorde un seul point pour un mot intermédiaire', () => {
    let state = acknowledge(play(match(), 'C'));
    state = acknowledge(play(state, 'H'));
    state = play(state, 'A');

    expect(state.resolution).toMatchObject({ kind: 'intermediate-word', word: 'CHA', points: 1 });
    expect(state.players.find((player) => player.id === state.currentPlayerId)?.score).toBe(1);
  });

  it('accorde exactement trois points pour un mot terminal', () => {
    const terminalDictionary = createMemoryDictionary(['CHAT']);
    let state = createMatch(['Alice', 'Benoit'], terminalDictionary, 'partie-42');
    for (const letter of ['C', 'H', 'A']) {
      state = reduce(state, { type: 'PLAY_LETTER', letter }, terminalDictionary);
      state = reduce(state, { type: 'ACKNOWLEDGE_RESULT' }, terminalDictionary);
    }
    state = reduce(state, { type: 'PLAY_LETTER', letter: 'T' }, terminalDictionary);

    expect(state).toMatchObject({
      prefix: 'CHAT',
      phase: 'round-result',
      resolution: { kind: 'terminal-word', word: 'CHAT', points: 3 },
    });
    expect(state.players.find((player) => player.id === state.currentPlayerId)?.score).toBe(3);
  });

  it('rejette la lettre invalide, borne le score à zéro et élimine son auteur', () => {
    const before = match();
    const result = play(before, 'Z');

    expect(result).toMatchObject({
      prefix: '',
      phase: 'turn-result',
      resolution: { kind: 'invalid-letter', attemptedPrefix: 'Z', points: -1 },
    });
    expect(result.players.find((player) => player.id === before.currentPlayerId)).toMatchObject({
      score: 0,
      active: false,
    });
  });

  it('saute les joueurs éliminés lors de la rotation', () => {
    let state = play(match(), 'Z');
    state = acknowledge(state);

    expect(state.phase).toBe('turn');
    expect(state.currentPlayerId).not.toBe('player-0');
    expect(state.players.find((player) => player.id === 'player-0')?.active).toBe(false);
  });

  it('ne donne aucun bonus au dernier joueur actif après les éliminations', () => {
    let state = match();
    state = acknowledge(play(state, 'Z'));
    state = acknowledge(play(state, 'Z'));

    expect(state).toMatchObject({
      phase: 'round-result',
      resolution: { kind: 'elimination-round-end' },
      nextRoundStarterId: 'player-2',
    });
    expect(state.players.find((player) => player.id === 'player-2')?.score).toBe(0);
  });

  it('ne propose que des prolongements stricts après les éliminations', () => {
    let state = { ...match(), prefix: 'CHAT' };
    state = acknowledge(play(state, 'Z'));
    state = acknowledge(play(state, 'Z'));

    expect(state.resolution).toEqual({
      kind: 'elimination-round-end',
      completions: ['CHATON'],
    });
  });

  it('fait commencer le joueur après l’auteur après un mot terminal', () => {
    const terminalDictionary = createMemoryDictionary(['CHAT']);
    let state = createMatch(['Alice', 'Benoit'], terminalDictionary, 'partie-42');
    for (const letter of ['C', 'H', 'A']) {
      state = reduce(state, { type: 'PLAY_LETTER', letter }, terminalDictionary);
      state = reduce(state, { type: 'ACKNOWLEDGE_RESULT' }, terminalDictionary);
    }
    const author = state.currentPlayerId;
    state = reduce(state, { type: 'PLAY_LETTER', letter: 'T' }, terminalDictionary);
    state = reduce(state, { type: 'START_NEXT_ROUND' }, terminalDictionary);

    expect(state.currentPlayerId).not.toBe(author);
  });

  it('retient le joueur suivant dans l’ordre initial après un mot terminal', () => {
    const terminalDictionary = createMemoryDictionary(['CHAT']);
    const state: GameState = {
      version: 1,
      players: [
        { ...player('player-0', 0), active: false },
        player('player-1', 0),
        player('player-2', 0),
      ],
      round: 1,
      prefix: 'CHA',
      currentPlayerId: 'player-2',
      nextRoundStarterId: 'player-0',
      phase: 'turn',
      resolution: null,
      winners: [],
    };

    expect(
      reduce(state, { type: 'PLAY_LETTER', letter: 'T' }, terminalDictionary).nextRoundStarterId,
    ).toBe('player-0');
  });

  it('réactive tous les joueurs et garde le dernier survivant premier après les éliminations', () => {
    let state = match();
    state = acknowledge(play(state, 'Z'));
    state = acknowledge(play(state, 'Z'));
    state = reduce(state, { type: 'START_NEXT_ROUND' }, dictionary);

    expect(state.phase).toBe('turn');
    expect(state.currentPlayerId).toBe('player-2');
    expect(state.players.every((player) => player.active)).toBe(true);
  });

  it('ignore une action de jeu hors du tour actif', () => {
    const state = play(match(), 'C');

    expect(play(state, 'H')).toBe(state);
  });
});

describe('settleRound', () => {
  it('ne termine pas la partie avant la fin de manche', () => {
    const state = {
      ...match(),
      players: [player('a', 10), player('b', 2), player('c', 0)],
    };

    expect(settleRound(state).phase).toBe('turn');
  });

  it('termine avec deux gagnants au même score maximal', () => {
    const state = stateAtRoundEnd([player('a', 12), player('b', 12), player('c', 10)]);

    expect(settleRound(state).winners).toEqual(['a', 'b']);
    expect(settleRound(state).phase).toBe('game-over');
  });
});

describe('restoreMatch', () => {
  it('restaure une partie sérialisée valide', () => {
    const state = match();

    expect(restoreMatch(JSON.parse(JSON.stringify(state)), dictionary)).toEqual(state);
  });

  it('rejette une sauvegarde incohérente', () => {
    expect(restoreMatch({ ...match(), prefix: 'Z' }, dictionary)).toBeNull();
  });

  it('rejette une résolution persistée qui ne correspond plus au dictionnaire', () => {
    const pending = play(match(), 'C');
    const resolution = pending.resolution;
    if (resolution?.kind !== 'valid-prefix') throw new Error('Précondition de test invalide');
    const forged = {
      ...pending,
      resolution: { ...resolution, lookup: { ...resolution.lookup, continuationCount: 999 } },
    };

    expect(restoreMatch(forged, dictionary)).toBeNull();
  });

  it('rejette une résolution absente ou mal formée au lieu de la remplacer par null', () => {
    const state = match();
    const withoutResolution = { ...state } as Record<string, unknown>;
    delete withoutResolution['resolution'];

    expect(restoreMatch(withoutResolution, dictionary)).toBeNull();
    expect(restoreMatch({ ...state, resolution: { kind: 'bogus' } }, dictionary)).toBeNull();
  });

  it('rejette un joueur courant inactif pendant un tour', () => {
    const state = match();
    const forged = {
      ...state,
      players: state.players.map((player) =>
        player.id === state.currentPlayerId ? { ...player, active: false } : player,
      ),
    };

    expect(restoreMatch(forged, dictionary)).toBeNull();
  });

  it('rejette une tentative invalide dont l’auteur restauré est actif', () => {
    const state = play(match(), 'Z');
    const forged = {
      ...state,
      players: state.players.map((player) =>
        player.id === state.currentPlayerId ? { ...player, active: true } : player,
      ),
    };

    expect(restoreMatch(forged, dictionary)).toBeNull();
  });

  it('rejette un premier joueur de manche falsifié après un mot terminal', () => {
    const terminalDictionary = createMemoryDictionary(['CHAT']);
    const state = stateAtRoundEnd([player('a', 3), player('b', 0), player('c', 0)]);

    expect(restoreMatch({ ...state, nextRoundStarterId: 'c' }, terminalDictionary)).toBeNull();
  });

  it('rejette un premier joueur de manche falsifié après les éliminations', () => {
    let state = match();
    state = acknowledge(play(state, 'Z'));
    state = acknowledge(play(state, 'Z'));
    const forgedStarter = state.players.find((player) => player.id !== state.currentPlayerId)?.id;

    expect(restoreMatch({ ...state, nextRoundStarterId: forgedStarter }, dictionary)).toBeNull();
  });

  it('rejette un résultat de manche qui aurait déjà dû terminer la partie', () => {
    const terminalDictionary = createMemoryDictionary(['CHAT']);
    const state = stateAtRoundEnd([player('a', 10), player('b', 2), player('c', 0)]);

    expect(restoreMatch(state, terminalDictionary)).toBeNull();
  });

  it('rejette des gagnants dupliqués au lieu de l’ensemble exact des ex æquo', () => {
    const terminalDictionary = createMemoryDictionary(['CHAT']);
    const state = settleRound(stateAtRoundEnd([player('a', 12), player('b', 12), player('c', 10)]));

    expect(restoreMatch({ ...state, winners: ['a', 'a'] }, terminalDictionary)).toBeNull();
  });

  it('rejette un score restauré non entier', () => {
    const state = match();
    const forged = {
      ...state,
      players: [{ ...state.players[0], score: 0.5 }, ...state.players.slice(1)],
    };

    expect(restoreMatch(forged, dictionary)).toBeNull();
  });

  it.each([
    [
      'pseudonyme vide',
      (state: GameState) => ({
        ...state,
        players: [{ ...state.players[0], name: ' ' }, ...state.players.slice(1)],
      }),
    ],
    [
      'pseudonymes dupliqués sans tenir compte de la casse',
      (state: GameState) => ({
        ...state,
        players: [
          state.players[0],
          { ...state.players[1], name: ` ${state.players[0].name.toLocaleUpperCase('fr-FR')} ` },
          ...state.players.slice(2),
        ],
      }),
    ],
    [
      'identifiant vide',
      (state: GameState) => ({
        ...state,
        players: [{ ...state.players[0], id: '' }, ...state.players.slice(1)],
        currentPlayerId: '',
        nextRoundStarterId: '',
      }),
    ],
    [
      'identifiant composé d’espaces',
      (state: GameState) => ({
        ...state,
        players: [{ ...state.players[0], id: ' ' }, ...state.players.slice(1)],
        currentPlayerId: ' ',
        nextRoundStarterId: ' ',
      }),
    ],
  ])('rejette une sauvegarde avec $0', (_label, forge) => {
    expect(restoreMatch(forge(match()), dictionary)).toBeNull();
  });

  it('rejette une tentative invalide qui ajoute autre chose qu’une lettre A-Z', () => {
    const invalid = play(match(), 'Z');
    expect(
      restoreMatch(
        { ...invalid, resolution: { kind: 'invalid-letter', attemptedPrefix: '1', points: -1 } },
        dictionary,
      ),
    ).toBeNull();
  });

  it('détache les tableaux restaurés de la sauvegarde brute', () => {
    const raw = JSON.parse(JSON.stringify(play(match(), 'C'))) as {
      winners: string[];
      resolution: { kind: 'valid-prefix'; lookup: { nextLetters: string[] } };
    };
    const restored = restoreMatch(raw, dictionary);
    if (!restored || restored.resolution?.kind !== 'valid-prefix') {
      throw new Error('Précondition de test invalide');
    }

    raw.winners.push('intrus');
    raw.resolution.lookup.nextLetters.push('Z');

    expect(restored.winners).toEqual([]);
    expect(restored.resolution.lookup.nextLetters).toEqual(['H']);
  });
});
