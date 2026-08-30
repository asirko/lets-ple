import { describe, expect, it } from 'vitest';
import { createMemoryDictionary } from './dictionary';

describe('createMemoryDictionary', () => {
  it('distingue mot courant et prolongements stricts', () => {
    const dictionary = createMemoryDictionary(['CHA', 'CHAT', 'CHATON', 'CHANT']);

    expect(dictionary.lookup('chat')).toEqual({
      normalized: 'CHAT',
      isWord: true,
      continuationCount: 1,
      nextLetters: ['O'],
    });
  });

  it('normalise les préfixes et les entrées', () => {
    const dictionary = createMemoryDictionary(['Été', 'ÉTENDRE', 'ETAPE']);

    expect(dictionary.lookup('été')).toEqual({
      normalized: 'ETE',
      isWord: true,
      continuationCount: 1,
      nextLetters: ['N'],
    });
  });

  it('classe les complétions par longueur puis fréquence', () => {
    const dictionary = createMemoryDictionary([
      { normalized: 'CHARME', frequency: 8 },
      { normalized: 'CHAT', frequency: 20 },
      { normalized: 'CHANT', frequency: 30 },
    ]);

    expect(dictionary.completions('CHA', 2)).toEqual(['CHAT', 'CHANT']);
  });

  it('déduplique les entrées normalisées et borne la limite', () => {
    const dictionary = createMemoryDictionary([
      'chat',
      'CHAT',
      { normalized: 'CHATON', frequency: 3 },
    ]);

    expect(dictionary.completions('cha', 10)).toEqual(['CHAT', 'CHATON']);
    expect(dictionary.completions('chat', 10)).toEqual(['CHATON']);
    expect(dictionary.completions('cha', 0)).toEqual([]);
  });
});
