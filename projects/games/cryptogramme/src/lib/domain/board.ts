import type { Sym, AccentMode, Cell } from './types';
import { toSymbols } from './alphabet';

/**
 * Construit le plateau : une case par caractère du texte.
 *
 * Les cases dont le symbole fait partie des correspondances offertes sont pré-remplies et
 * marquées `given`. Toutes les autres cases `letter` démarrent vides, et leur ensemble
 * détermine exactement le contenu de la pioche (voir `buildDeck`).
 */
export function buildBoard(
  text: string,
  mode: AccentMode,
  cipher: ReadonlyMap<Sym, number>,
  givens: ReadonlySet<Sym>,
): Cell[] {
  const chars = [...text];
  const symbols = toSymbols(text, mode);

  return symbols.map((sym, i): Cell => {
    if (sym === null) return { kind: 'fixed', char: chars[i] };
    const given = givens.has(sym);
    return {
      kind: 'letter',
      code: cipher.get(sym)!,
      char: chars[i],
      filled: given ? sym : null,
      given,
    };
  });
}
