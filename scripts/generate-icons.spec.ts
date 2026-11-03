import { describe, expect, it } from 'vitest';
import { packIco } from './generate-icons';

describe('packIco', () => {
  it('assemble un ICO à PNG embarqués', () => {
    const ico = packIco([
      { size: 16, png: new Uint8Array([1, 2, 3, 4]) },
      { size: 32, png: new Uint8Array([5, 6, 7, 8]) },
    ]);
    expect(ico.length).toBe(6 + 2 * 16 + 8);
    expect(Array.from(ico.slice(0, 6))).toEqual([0, 0, 1, 0, 2, 0]);
    expect(ico[6]).toBe(16);
    // Offset de la première image : octets 18..21 de l'entrée (6 + 12), little-endian.
    expect(new DataView(ico.buffer).getUint32(6 + 12, true)).toBe(38);
  });
});
