import type { Sym } from './types';
import { shuffle } from './rng';

/**
 * Construit la pioche : **une carte par case à remplir**.
 *
 * Si la citation contient cinq « E », la pioche contient cinq cartes E. La pioche est donc
 * l'inventaire exact des cases vides, ce dont découle l'invariant central du moteur :
 *
 *     |pioche| + |main| = nombre de cases vides
 *
 * Ce n'est pas un détail d'implémentation mais la garantie qu'aucune partie n'est insoluble :
 * quelle que soit la carte en main, il existe forcément une case où la poser correctement.
 */
export function buildDeck(
  solution: readonly (Sym | null)[],
  givens: ReadonlySet<Sym>,
  rng: () => number,
): Sym[] {
  const cards = solution.filter((sym): sym is Sym => sym !== null && !givens.has(sym));
  return shuffle(cards, rng);
}
