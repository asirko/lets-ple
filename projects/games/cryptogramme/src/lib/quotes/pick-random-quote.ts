export function pickRandomQuote<T>(items: readonly T[], rng: () => number = Math.random): T {
  if (items.length === 0) {
    throw new Error('pickRandomQuote: la liste est vide');
  }
  return items[Math.floor(rng() * items.length)];
}
