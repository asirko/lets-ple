/** Générateur déterministe compact pour le tirage du premier joueur. */
export function createSeededRandom(seed: string): () => number {
  let value = hashSeed(seed);
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function pickIndex(seed: string, length: number): number {
  if (!Number.isInteger(length) || length <= 0) throw new RangeError('length doit etre positif');
  return Math.floor(createSeededRandom(seed)() * length);
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16_777_619);
  }
  return hash >>> 0;
}
