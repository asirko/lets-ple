import type { Sym } from './types';
import { shuffle } from './rng';

/**
 * Attribue à chaque symbole un nombre distinct, tiré dans 1..N sans trou.
 *
 * Les nombres sont consécutifs plutôt qu'épars : un intervalle à trous laisserait fuiter le
 * nombre de symboles réellement présents dans la citation, information que le joueur doit
 * justement déduire.
 */
export function buildCipher(symbols: readonly Sym[], rng: () => number): Map<Sym, number> {
  const codes = shuffle(
    Array.from({ length: symbols.length }, (_, i) => i + 1),
    rng,
  );
  return new Map(symbols.map((sym, i) => [sym, codes[i]]));
}
