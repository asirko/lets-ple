import type { Sym } from './types';
import { isVowel } from './alphabet';
import { shuffle } from './rng';

/**
 * Choisit les correspondances offertes en début de partie.
 *
 * Le joueur ne reçoit que deux ou trois cadeaux, jamais plus. Avec une réserve aussi maigre,
 * le tirage ne peut pas être uniforme : sur une trentaine de symboles, il tomberait souvent
 * sur un 'Ê' ou un 'W' présent une seule fois, et n'offrirait aucune prise pour démarrer.
 *
 * Deux garde-fous en découlent : les symboles à occurrence unique sont écartés, et le tirage
 * se limite au tiers supérieur par fréquence. Une voyelle est toujours garantie.
 */
export function pickGivens(
  counts: ReadonlyMap<Sym, number>,
  count: number,
  rng: () => number,
): Set<Sym> {
  const target = Math.min(Math.max(count, 2), 3, counts.size);

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([sym]) => sym);

  // Écarter les hapax, sauf si la citation est trop courte pour en avoir assez sans eux.
  const frequents = ranked.filter((sym) => (counts.get(sym) ?? 0) > 1);
  const base = frequents.length >= target ? frequents : ranked;

  const poolSize = Math.min(base.length, Math.max(target, Math.ceil(base.length / 3)));
  const pool = base.slice(0, poolSize);

  const chosen = new Set<Sym>();

  // Garantir une voyelle : dans le vivier si possible, sinon la plus fréquente du texte.
  const vowelsInPool = pool.filter(isVowel);
  const vowelPool = vowelsInPool.length > 0 ? vowelsInPool : ranked.filter(isVowel);
  if (vowelPool.length > 0) {
    chosen.add(shuffle(vowelPool, rng)[0]);
  }

  for (const sym of shuffle(pool, rng)) {
    if (chosen.size >= target) break;
    chosen.add(sym);
  }

  return chosen;
}
