import type { DictionaryPort, PrefixLookup } from './dictionary';
import { normalizeWord } from './normalize-word';
import { pickIndex } from './rng';

const TARGET_SCORE = 10;

export type Phase = 'turn' | 'turn-result' | 'round-result' | 'game-over';

export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly active: boolean;
}

export type TurnResolution =
  | { readonly kind: 'valid-prefix'; readonly lookup: PrefixLookup }
  | {
      readonly kind: 'intermediate-word';
      readonly word: string;
      readonly lookup: PrefixLookup;
      readonly points: 1;
    }
  | { readonly kind: 'invalid-letter'; readonly attemptedPrefix: string; readonly points: -1 }
  | { readonly kind: 'terminal-word'; readonly word: string; readonly points: 3 }
  | { readonly kind: 'elimination-round-end'; readonly completions: readonly string[] };

export type Action =
  | { readonly type: 'PLAY_LETTER'; readonly letter: string }
  | { readonly type: 'ACKNOWLEDGE_RESULT' }
  | { readonly type: 'START_NEXT_ROUND' };

export interface GameState {
  readonly version: 1;
  readonly players: readonly PlayerState[];
  readonly round: number;
  readonly prefix: string;
  readonly currentPlayerId: string;
  readonly nextRoundStarterId: string;
  readonly phase: Phase;
  readonly resolution: TurnResolution | null;
  readonly winners: readonly string[];
}

export function createMatch(
  names: readonly string[],
  _dictionary: DictionaryPort,
  seed: string,
): GameState {
  if (names.length < 2) throw new RangeError('Au moins deux joueurs sont requis');
  const cleanedNames = names.map((name) => name.trim());
  const uniqueNames = new Set(cleanedNames.map((name) => name.toLocaleLowerCase('fr-FR')));
  if (cleanedNames.some((name) => name === '') || uniqueNames.size !== cleanedNames.length) {
    throw new RangeError('Les pseudonymes doivent être non vides et uniques');
  }
  const players = cleanedNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    score: 0,
    active: true,
  }));
  const firstPlayerId = players[pickIndex(seed, players.length)].id;
  return {
    version: 1,
    players,
    round: 1,
    prefix: '',
    currentPlayerId: firstPlayerId,
    nextRoundStarterId: firstPlayerId,
    phase: 'turn',
    resolution: null,
    winners: [],
  };
}

export function reduce(state: GameState, action: Action, dictionary: DictionaryPort): GameState {
  switch (action.type) {
    case 'PLAY_LETTER':
      return playLetter(state, action.letter, dictionary);
    case 'ACKNOWLEDGE_RESULT':
      return acknowledgeResult(state, dictionary);
    case 'START_NEXT_ROUND':
      return startNextRound(state);
  }
}

export function settleRound(state: GameState): GameState {
  if (state.phase !== 'round-result') return state;
  const maxScore = Math.max(...state.players.map((player) => player.score));
  if (maxScore < TARGET_SCORE) return state;
  return {
    ...state,
    phase: 'game-over',
    winners: state.players.filter((player) => player.score === maxScore).map((player) => player.id),
  };
}

export function restoreMatch(value: unknown, dictionary: DictionaryPort): GameState | null {
  if (!isRecord(value) || value['version'] !== 1 || !Array.isArray(value['players'])) return null;
  const phase = value['phase'];
  const prefix = value['prefix'];
  const round = value['round'];
  const currentPlayerId = value['currentPlayerId'];
  const nextRoundStarterId = value['nextRoundStarterId'];
  const winners = value['winners'];
  if (!isPhase(phase) || typeof prefix !== 'string' || !/^[A-Z]*$/.test(prefix)) return null;
  if (typeof round !== 'number' || !Number.isInteger(round) || round < 1) return null;
  if (typeof currentPlayerId !== 'string' || typeof nextRoundStarterId !== 'string') return null;
  if (!isStringArray(winners)) return null;
  const players = value['players'].map(toPlayerState);
  if (players.some((player) => player === null) || players.length < 2) return null;
  const restoredPlayers = players as PlayerState[];
  const ids = new Set(restoredPlayers.map((player) => player.id));
  const normalizedNames = restoredPlayers.map((player) =>
    player.name.trim().toLocaleLowerCase('fr-FR'),
  );
  if (
    ids.size !== restoredPlayers.length ||
    new Set(normalizedNames).size !== restoredPlayers.length ||
    !ids.has(currentPlayerId) ||
    !ids.has(nextRoundStarterId)
  )
    return null;
  if (prefix !== '') {
    const lookup = dictionary.lookup(prefix);
    if (!lookup.isWord && lookup.continuationCount === 0) return null;
  }
  const resolution = toResolution(value['resolution']);
  if (resolution === undefined) return null;
  if (!isResolutionConsistent(prefix, resolution, dictionary)) return null;
  if (
    !isRestorablePhase(
      phase,
      resolution,
      restoredPlayers,
      currentPlayerId,
      nextRoundStarterId,
      winners,
    )
  )
    return null;

  return {
    version: 1,
    players: restoredPlayers,
    round,
    prefix,
    currentPlayerId,
    nextRoundStarterId,
    phase,
    resolution,
    winners: [...winners],
  };
}

function playLetter(state: GameState, letter: string, dictionary: DictionaryPort): GameState {
  if (state.phase !== 'turn') return state;
  const normalizedLetter = normalizeWord(letter);
  if (!/^[A-Z]$/.test(normalizedLetter)) return state;

  const attemptedPrefix = state.prefix + normalizedLetter;
  const lookup = dictionary.lookup(attemptedPrefix);
  if (!lookup.isWord && lookup.continuationCount === 0) {
    return {
      ...state,
      players: updatePlayer(state.players, state.currentPlayerId, (player) => ({
        ...player,
        score: Math.max(0, player.score - 1),
        active: false,
      })),
      phase: 'turn-result',
      resolution: { kind: 'invalid-letter', attemptedPrefix, points: -1 },
    };
  }
  if (lookup.isWord && lookup.continuationCount === 0) {
    const roundResult: GameState = {
      ...state,
      players: updatePlayer(state.players, state.currentPlayerId, (player) => ({
        ...player,
        score: player.score + 3,
      })),
      prefix: attemptedPrefix,
      nextRoundStarterId: nextPlayerId(state.players, state.currentPlayerId),
      phase: 'round-result',
      resolution: { kind: 'terminal-word', word: attemptedPrefix, points: 3 },
    };
    return settleRound(roundResult);
  }
  if (lookup.isWord) {
    return {
      ...state,
      players: updatePlayer(state.players, state.currentPlayerId, (player) => ({
        ...player,
        score: player.score + 1,
      })),
      prefix: attemptedPrefix,
      phase: 'turn-result',
      resolution: { kind: 'intermediate-word', word: attemptedPrefix, lookup, points: 1 },
    };
  }
  return {
    ...state,
    prefix: attemptedPrefix,
    phase: 'turn-result',
    resolution: { kind: 'valid-prefix', lookup },
  };
}

function acknowledgeResult(state: GameState, dictionary: DictionaryPort): GameState {
  if (state.phase !== 'turn-result') return state;
  const activePlayers = state.players.filter((player) => player.active);
  if (activePlayers.length === 1) {
    return settleRound({
      ...state,
      currentPlayerId: activePlayers[0].id,
      nextRoundStarterId: activePlayers[0].id,
      phase: 'round-result',
      resolution: {
        kind: 'elimination-round-end',
        completions: dictionary.completions(state.prefix, 5),
      },
    });
  }
  return {
    ...state,
    currentPlayerId: nextActivePlayerId(state.players, state.currentPlayerId),
    phase: 'turn',
    resolution: null,
  };
}

function startNextRound(state: GameState): GameState {
  if (state.phase !== 'round-result') return state;
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, active: true })),
    round: state.round + 1,
    prefix: '',
    currentPlayerId: state.nextRoundStarterId,
    phase: 'turn',
    resolution: null,
    winners: [],
  };
}

function updatePlayer(
  players: readonly PlayerState[],
  id: string,
  update: (player: PlayerState) => PlayerState,
): readonly PlayerState[] {
  return players.map((player) => (player.id === id ? update(player) : player));
}

function nextActivePlayerId(players: readonly PlayerState[], currentPlayerId: string): string {
  const currentIndex = players.findIndex((player) => player.id === currentPlayerId);
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = players[(currentIndex + offset) % players.length];
    if (candidate.active) return candidate.id;
  }
  return currentPlayerId;
}

function nextPlayerId(players: readonly PlayerState[], currentPlayerId: string): string {
  const currentIndex = players.findIndex((player) => player.id === currentPlayerId);
  return players[(currentIndex + 1) % players.length]?.id ?? currentPlayerId;
}

function toPlayerState(value: unknown): PlayerState | null {
  if (!isRecord(value)) return null;
  const id = value['id'];
  const name = value['name'];
  const score = value['score'];
  const active = value['active'];
  if (
    typeof id !== 'string' ||
    id.trim() === '' ||
    typeof name !== 'string' ||
    name === '' ||
    name !== name.trim() ||
    typeof active !== 'boolean'
  )
    return null;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) return null;
  return { id, name, score, active };
}

function toResolution(value: unknown): TurnResolution | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || typeof value['kind'] !== 'string') return undefined;
  const kind = value['kind'];
  const attemptedPrefix = value['attemptedPrefix'];
  const points = value['points'];
  const word = value['word'];
  const completions = value['completions'];
  const lookup = value['lookup'];
  if (kind === 'invalid-letter' && typeof attemptedPrefix === 'string' && points === -1) {
    return { kind, attemptedPrefix, points: -1 };
  }
  if (kind === 'terminal-word' && typeof word === 'string' && points === 3) {
    return { kind, word, points: 3 };
  }
  if (kind === 'elimination-round-end' && isStringArray(completions)) {
    return { kind, completions: [...completions] };
  }
  if ((kind === 'valid-prefix' || kind === 'intermediate-word') && isLookup(lookup)) {
    const copiedLookup = copyLookup(lookup);
    if (kind === 'valid-prefix') return { kind, lookup: copiedLookup };
    if (typeof word === 'string' && points === 1) {
      return { kind, word, lookup: copiedLookup, points: 1 };
    }
  }
  return undefined;
}

function isRestorablePhase(
  phase: Phase,
  resolution: TurnResolution | null,
  players: readonly PlayerState[],
  currentPlayerId: string,
  nextRoundStarterId: string,
  winners: readonly string[],
): boolean {
  const activeCount = players.filter((player) => player.active).length;
  const currentPlayer = players.find((player) => player.id === currentPlayerId);
  if (!currentPlayer) return false;
  if (phase === 'turn') {
    return resolution === null && winners.length === 0 && activeCount >= 2 && currentPlayer.active;
  }
  if (phase === 'turn-result') {
    const minimumActivePlayers = resolution?.kind === 'invalid-letter' ? 1 : 2;
    return (
      resolution !== null &&
      resolution.kind !== 'terminal-word' &&
      resolution.kind !== 'elimination-round-end' &&
      winners.length === 0 &&
      activeCount >= minimumActivePlayers &&
      (resolution.kind === 'invalid-letter' ? !currentPlayer.active : currentPlayer.active)
    );
  }
  if (resolution?.kind !== 'terminal-word' && resolution?.kind !== 'elimination-round-end')
    return false;
  if (
    resolution.kind === 'terminal-word' &&
    (activeCount < 2 ||
      !currentPlayer.active ||
      nextRoundStarterId !== nextPlayerId(players, currentPlayerId))
  )
    return false;
  if (
    resolution.kind === 'elimination-round-end' &&
    (activeCount !== 1 || !currentPlayer.active || nextRoundStarterId !== currentPlayerId)
  )
    return false;
  const maxScore = Math.max(...players.map((player) => player.score));
  if (phase === 'round-result') return maxScore < TARGET_SCORE && winners.length === 0;
  const expectedWinners = players
    .filter((player) => player.score === maxScore)
    .map((player) => player.id);
  const winnerIds = new Set(winners);
  return (
    maxScore >= TARGET_SCORE &&
    winners.length === expectedWinners.length &&
    winnerIds.size === winners.length &&
    winners.every((id) => expectedWinners.includes(id)) &&
    expectedWinners.every((id) => winnerIds.has(id))
  );
}

function isResolutionConsistent(
  prefix: string,
  resolution: TurnResolution | null,
  dictionary: DictionaryPort,
): boolean {
  if (resolution === null) return true;
  const lookup = dictionary.lookup(prefix);
  switch (resolution.kind) {
    case 'valid-prefix':
      return (
        prefix !== '' &&
        !lookup.isWord &&
        lookup.continuationCount > 0 &&
        sameLookup(resolution.lookup, lookup)
      );
    case 'intermediate-word':
      return (
        resolution.word === prefix &&
        lookup.isWord &&
        lookup.continuationCount > 0 &&
        sameLookup(resolution.lookup, lookup)
      );
    case 'terminal-word':
      return resolution.word === prefix && lookup.isWord && lookup.continuationCount === 0;
    case 'invalid-letter': {
      if (
        !/^[A-Z]+$/.test(resolution.attemptedPrefix) ||
        !resolution.attemptedPrefix.startsWith(prefix) ||
        resolution.attemptedPrefix.length !== prefix.length + 1
      )
        return false;
      const attemptedLookup = dictionary.lookup(resolution.attemptedPrefix);
      return !attemptedLookup.isWord && attemptedLookup.continuationCount === 0;
    }
    case 'elimination-round-end':
      return sameStrings(resolution.completions, dictionary.completions(prefix, 5));
  }
}

function sameLookup(left: PrefixLookup, right: PrefixLookup): boolean {
  return (
    left.normalized === right.normalized &&
    left.isWord === right.isWord &&
    left.continuationCount === right.continuationCount &&
    sameStrings(left.nextLetters, right.nextLetters)
  );
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function copyLookup(lookup: PrefixLookup): PrefixLookup {
  return { ...lookup, nextLetters: [...lookup.nextLetters] };
}

function isLookup(value: unknown): value is PrefixLookup {
  return (
    isRecord(value) &&
    typeof value['normalized'] === 'string' &&
    typeof value['isWord'] === 'boolean' &&
    typeof value['continuationCount'] === 'number' &&
    Array.isArray(value['nextLetters']) &&
    value['nextLetters'].every((letter) => typeof letter === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPhase(value: unknown): value is Phase {
  return (
    value === 'turn' || value === 'turn-result' || value === 'round-result' || value === 'game-over'
  );
}
