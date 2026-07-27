/**
 * Aléa déterministe du moteur.
 *
 * Tout le hasard du jeu passe par ce module et par lui seul. `Math.random()` rendrait les
 * tests non reproductibles et interdirait de rejouer une partie identique — or la graine est
 * ce qui permet de simuler des milliers de parties pour l'équilibrage, et ce qui rendra une
 * « énigme du jour » partageable possible sans toucher au moteur.
 */

/** Hache une chaîne en entier 32 bits non signé (xfnv1a). */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Générateur mulberry32 : rapide, à état minimal, de qualité largement suffisante pour du jeu.
 * Retourne une fonction produisant des valeurs dans [0, 1).
 */
export function createRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates appliqué à une copie : le tableau source n'est jamais modifié. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
