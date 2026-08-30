/** Normalise un mot pour les comparaisons du moteur, indépendamment de la casse et des accents. */
export function normalizeWord(value: string): string {
  return value
    .replace(/[Œœ]/g, 'OE')
    .replace(/[Ææ]/g, 'AE')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('fr-FR');
}
