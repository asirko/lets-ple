import type { Sym, AccentMode } from './types';

/**
 * Conversion d'un texte en symboles de jeu.
 *
 * La sortie est alignée caractère par caractère sur l'entrée : `toSymbols(t)[i]` correspond
 * toujours au i-ème caractère de `t`. C'est cet alignement qui permettra plus tard de
 * réafficher l'accentuation d'origine une fois une case résolue.
 */

const VOWELS = new Set([
  'A', 'À', 'Â', 'Ä',
  'E', 'É', 'È', 'Ê', 'Ë',
  'I', 'Î', 'Ï',
  'O', 'Ô', 'Ö',
  'U', 'Ù', 'Û', 'Ü',
  'Y', 'Ÿ',
]);

/** Retire les diacritiques : 'É' → 'E', 'Ç' → 'C'. */
function stripAccent(char: string): string {
  return char.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Convertit un texte en symboles, un par caractère. `null` = case fixe (espace, ponctuation). */
export function toSymbols(text: string, mode: AccentMode): (Sym | null)[] {
  return [...text].map((char) => {
    const upper = char.toUpperCase();
    const base = stripAccent(upper);
    if (!/^[A-Z]$/.test(base)) return null;
    return mode === 'distinct' ? upper : base;
  });
}

export function isVowel(sym: Sym): boolean {
  return VOWELS.has(sym);
}

/** Symboles distincts, dans leur ordre d'apparition dans le texte. */
export function distinctSymbols(symbols: readonly (Sym | null)[]): Sym[] {
  const seen = new Set<Sym>();
  const result: Sym[] = [];
  for (const sym of symbols) {
    if (sym !== null && !seen.has(sym)) {
      seen.add(sym);
      result.push(sym);
    }
  }
  return result;
}

/** Nombre d'occurrences de chaque symbole, cases fixes ignorées. */
export function symbolCounts(symbols: readonly (Sym | null)[]): Map<Sym, number> {
  const counts = new Map<Sym, number>();
  for (const sym of symbols) {
    if (sym !== null) counts.set(sym, (counts.get(sym) ?? 0) + 1);
  }
  return counts;
}
