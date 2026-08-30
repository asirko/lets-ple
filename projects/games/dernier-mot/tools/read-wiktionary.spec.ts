import { gzipSync } from 'node:zlib';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readWiktionary } from './read-wiktionary';

const fixture = fileURLToPath(new URL('./fixtures/wiktionary.jsonl', import.meta.url));

describe('readWiktionary', () => {
  it('ne conserve que les entrées françaises Wiktextract utiles', async () => {
    const entries = [];
    for await (const entry of readWiktionary(fixture)) entries.push(entry);

    expect(entries.find((entry) => entry.word === 'chat')).toEqual({
      word: 'chat',
      pos: 'noun',
      senses: [
        {
          glosses: ['Mammifère domestique de la famille des félidés.'],
          tags: [],
          formOf: [],
        },
      ],
    });
    expect(entries.some((entry) => entry.word === 'vide')).toBe(false);
    expect(entries.some((entry) => entry.word === undefined)).toBe(false);
    expect(entries.filter((entry) => entry.word === 'chat')).toHaveLength(1);
    expect(entries.find((entry) => entry.word === 'multiligne')?.senses[0]?.glosses).toEqual([
      'Première ligne\ndeuxième ligne.',
    ]);
    expect(entries.find((entry) => entry.word === 'porte' && entry.pos === 'verb')?.senses).toEqual(
      [
        {
          glosses: ['Première personne du singulier de porter.'],
          tags: ['form-of', 'indicative'],
          formOf: ['porter'],
        },
        {
          glosses: ['Deuxième personne du singulier de porter.'],
          tags: ['form-of', 'imperative'],
          formOf: ['porter'],
        },
        {
          glosses: ['Troisième personne du singulier de l’indicatif présent de porter.'],
          tags: [],
          formOf: [],
        },
        {
          glosses: ['Participe passé du verbe porter.'],
          tags: [],
          formOf: [],
        },
        {
          glosses: ['Participe passé masculin singulier du verbe porter.'],
          tags: [],
          formOf: [],
        },
        {
          glosses: ['Participe présent (invariable) de porter.'],
          tags: [],
          formOf: [],
        },
      ],
    );
    expect(entries.find((entry) => entry.word === 'porte' && entry.pos === 'adj')?.senses).toEqual([
      {
        glosses: ['Qualifie les parties du système circulatoire reliant deux réseaux capillaires.'],
        tags: [],
        formOf: [],
      },
      {
        glosses: ['Participe passé masculin singulier de porter.'],
        tags: [],
        formOf: [],
      },
    ]);
  });

  it('lit un dump Wiktextract gzip sans le décompresser sur disque', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dernier-mot-wiktionary-gzip-'));
    const gzipPath = join(directory, 'fr-wiktionary.jsonl.gz');
    await writeFile(gzipPath, gzipSync(await readFile(fixture)));

    const entries = [];
    for await (const entry of readWiktionary(gzipPath)) entries.push(entry);

    expect(entries.some((entry) => entry.word === 'œuvre')).toBe(true);
    expect(entries.some((entry) => entry.word === 'chat')).toBe(true);
  });
});
