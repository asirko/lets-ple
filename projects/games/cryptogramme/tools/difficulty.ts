import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AccentMode, Sym } from '../src/lib/domain/types';
import { toSymbols, distinctSymbols, symbolCounts } from '../src/lib/domain/alphabet';

export interface DifficultyFactors {
  occurrencesPerSymbol: number;
  rareSymbolRatio: number;
  shortWordRatio: number;
  frequencyDivergence: number;
  distinctSymbols: number;
}

interface Weights {
  base: number;
  occurrencesPerSymbol: number;
  rareSymbolRatio: number;
  shortWordRatio: number;
  frequencyDivergence: number;
  distinctSymbols: number;
  notoriety: number;
}

const WEIGHTS_PATH = join(dirname(fileURLToPath(import.meta.url)), 'difficulty-weights.json');
const WEIGHTS: Weights = JSON.parse(readFileSync(WEIGHTS_PATH, 'utf8'));

const RARE_LETTERS = new Set(['J', 'K', 'Q', 'W', 'X', 'Y', 'Z']);
const SHORT_WORD_MAX_LENGTH = 3;

/** Fréquence approximative des lettres en français (en %), sur la lettre nue. */
const FRENCH_LETTER_FREQUENCY: Record<string, number> = {
  E: 14.7, A: 7.6, S: 7.9, I: 7.5, T: 7.2, N: 7.1, R: 6.6, U: 6.3, L: 5.5, O: 5.3,
  D: 3.7, C: 3.3, P: 3.0, M: 3.0, V: 1.6, Q: 1.4, F: 1.1, B: 0.9, G: 0.9, H: 0.8,
  J: 0.5, X: 0.4, Y: 0.3, Z: 0.1, K: 0.05, W: 0.04,
};

function stripAccent(char: string): string {
  return char.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function splitWords(text: string): string[] {
  return text.split(/[^\p{L}]+/u).filter((w) => w.length > 0);
}

export function computeFactors(text: string, mode: AccentMode): DifficultyFactors {
  const symbols = toSymbols(text, mode);
  const letters = symbols.filter((sym): sym is Sym => sym !== null);
  const distinct = distinctSymbols(symbols);
  const counts = symbolCounts(symbols);

  const occurrencesPerSymbol = distinct.length > 0 ? letters.length / distinct.length : 0;

  const rareCount = letters.filter((sym) => RARE_LETTERS.has(stripAccent(sym))).length;
  const rareSymbolRatio = letters.length > 0 ? rareCount / letters.length : 0;

  const wordList = splitWords(text);
  const shortCount = wordList.filter((w) => [...w].length <= SHORT_WORD_MAX_LENGTH).length;
  const shortWordRatio = wordList.length > 0 ? shortCount / wordList.length : 0;

  let frequencyDivergence = 0;
  if (letters.length > 0) {
    for (const [sym, count] of counts) {
      const observed = count / letters.length;
      const expected = (FRENCH_LETTER_FREQUENCY[stripAccent(sym)] ?? 0) / 100;
      frequencyDivergence += Math.abs(observed - expected);
    }
  }

  return {
    occurrencesPerSymbol,
    rareSymbolRatio,
    shortWordRatio,
    frequencyDivergence,
    distinctSymbols: distinct.length,
  };
}

/** Combine les facteurs et la notoriété en un score 0..100. Poids externalisés dans difficulty-weights.json. */
export function computeScore(factors: DifficultyFactors, notoriety: number): number {
  const raw =
    WEIGHTS.base +
    WEIGHTS.occurrencesPerSymbol * factors.occurrencesPerSymbol +
    WEIGHTS.rareSymbolRatio * factors.rareSymbolRatio +
    WEIGHTS.shortWordRatio * factors.shortWordRatio +
    WEIGHTS.frequencyDivergence * factors.frequencyDivergence +
    WEIGHTS.distinctSymbols * factors.distinctSymbols +
    WEIGHTS.notoriety * notoriety;
  return Math.min(100, Math.max(0, raw));
}

export function toTier(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score < 20) return 1;
  if (score < 40) return 2;
  if (score < 60) return 3;
  if (score < 80) return 4;
  return 5;
}
