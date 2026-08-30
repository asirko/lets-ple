import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readLexique } from './read-lexique';

const fixture = fileURLToPath(new URL('./fixtures/lexique.tsv', import.meta.url));

describe('readLexique', () => {
  it('indexe les colonnes depuis un en-tête dont l’ordre est arbitraire', async () => {
    const entries = [];
    for await (const entry of readLexique(fixture)) entries.push(entry);

    expect(entries[0]).toEqual({
      spelling: 'chat',
      lemma: 'chat',
      category: 'NOM',
      gender: 'm',
      number: 's',
      frequency: 42.5,
    });
    expect(entries.at(2)?.spelling).toBe('manger');
    expect(entries.some((entry) => entry.spelling === 'bin')).toBe(false);
  });
});
