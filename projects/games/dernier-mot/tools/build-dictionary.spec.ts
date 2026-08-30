import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildDictionary, buildPrefixIndex } from './build-dictionary';
import type { DefinitionEntry, DictionaryManifest, SerializedPrefixIndex } from './types';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function snapshot(directory: string): Promise<readonly string[]> {
  const definitionDirectory = join(directory, 'definitions');
  const files = [
    'manifest.json',
    'index.json',
    ...(await readdir(definitionDirectory)).map((name) => `definitions/${name}`),
  ];
  return Promise.all(
    files.map(async (name) => `${name}\n${await readFile(join(directory, name), 'utf8')}`),
  );
}

describe('buildDictionary', () => {
  it('ne génère que les lemmes et catégories canoniques admis', async () => {
    const output = await mkdtemp(join(tmpdir(), 'dernier-mot-build-'));
    await buildDictionary({
      lexiquePath: fixture('lexique.tsv'),
      wiktionaryPath: fixture('wiktionary.jsonl'),
      sourcesManifestPath: fixture('sources.json'),
      outputDirectory: output,
    });

    const manifest = await readJson<DictionaryManifest>(join(output, 'manifest.json'));
    const index = await readJson<SerializedPrefixIndex>(join(output, 'index.json'));

    expect(manifest.entryCount).toBe(13);
    expect(manifest.sources).toEqual([
      expect.objectContaining({
        name: 'Lexique 4',
        creators: [
          'Boris New',
          'Christophe Pallier',
          'Gauvain Schalchli',
          'Jessica Bourgin',
          'Manuel Gimenes',
        ],
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        citation: {
          text: 'New, B., Pallier, C., Schalchli, G., Bourgin, J., & Gimenes, M. (2026). Lexique 4: A major upgrade of the Lexique French lexical database. Behavior Research Methods, 58(5), Article 140.',
          url: 'https://doi.org/10.3758/s13428-026-02967-5',
        },
      }),
      expect.objectContaining({
        name: 'Wiktionnaire',
        creators: ['Contributeurs du Wiktionnaire en français'],
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        attributionUrl:
          'https://fr.wiktionary.org/wiki/Wiktionnaire:R%C3%A9utilisation_du_contenu_du_Wiktionnaire',
        articleUrlTemplate: 'https://fr.wiktionary.org/wiki/{title}',
        contributorsUrlTemplate:
          'https://fr.wiktionary.org/w/index.php?title={title}&action=history',
        extractor: {
          name: 'Wiktextract',
          creator: 'Tatu Ylonen',
          url: 'https://github.com/tatuylonen/wiktextract',
          license: 'MIT',
          licenseUrl: 'https://github.com/tatuylonen/wiktextract/blob/master/LICENSE',
        },
      }),
    ]);
    expect(manifest.adaptation).toEqual({
      license: 'CC-BY-SA-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      notice:
        'Corpus dérivé : sélection de lemmes, exclusion des formes fléchies et graphies non alphabétiques, normalisation de la casse, des accents et des ligatures, fusion des homographes normalisés, construction d’un index de préfixes et découpage des définitions par initiale.',
    });
    expect(Object.keys(index).filter((key) => index[key]?.isWord)).toEqual([
      'CAECUM',
      'CHAT',
      'COEUR',
      'COTE',
      'JOLI',
      'MANGER',
      'OEUF',
      'OEUVRE',
      'PORTE',
      'RAPIDE',
      'SOURIS',
      'TRES',
      'ZESTE',
    ]);
    expect(index['CHATS']).toBeUndefined();
    expect(index['MANGE']?.isWord).toBe(false);
    expect(index['PARIS']).toBeUndefined();
    expect(index['ARC']).toBeUndefined();
  });

  it('normalise les ligatures dans les mots et graphies de définition', async () => {
    const output = await mkdtemp(join(tmpdir(), 'dernier-mot-ligatures-'));
    await buildDictionary({
      lexiquePath: fixture('lexique.tsv'),
      wiktionaryPath: fixture('wiktionary.jsonl'),
      sourcesManifestPath: fixture('sources.json'),
      outputDirectory: output,
    });

    const index = await readJson<SerializedPrefixIndex>(join(output, 'index.json'));
    const cDefinitions = await readJson<readonly DefinitionEntry[]>(
      join(output, 'definitions', 'C.json'),
    );
    expect(index['OEUF']?.isWord).toBe(true);
    expect(index['OEUVRE']?.isWord).toBe(true);
    expect(index['CAECUM']?.isWord).toBe(true);
    expect(cDefinitions.find((entry) => entry.normalized === 'COEUR')?.forms).toEqual([
      { spelling: 'coeur', glosses: ['Graphie sans ligature de cœur.'] },
      { spelling: 'cœur', glosses: ['Organe qui assure la circulation du sang.'] },
    ]);
  });

  it('fusionne les accents et groupe les graphies avec leurs définitions', async () => {
    const output = await mkdtemp(join(tmpdir(), 'dernier-mot-definitions-'));
    await buildDictionary({
      lexiquePath: fixture('lexique.tsv'),
      wiktionaryPath: fixture('wiktionary.jsonl'),
      sourcesManifestPath: fixture('sources.json'),
      outputDirectory: output,
    });

    const index = await readJson<SerializedPrefixIndex>(join(output, 'index.json'));
    const definitions = await readJson<readonly DefinitionEntry[]>(
      join(output, 'definitions', 'C.json'),
    );

    expect(index['COTE']).toMatchObject({ isWord: true, definitionId: 'COTE' });
    expect(definitions.find((entry) => entry.normalized === 'COTE')).toEqual({
      normalized: 'COTE',
      forms: [
        {
          spelling: 'cote',
          glosses: ['Classement ou niveau de popularité.', 'Valeur attribuée à quelque chose.'],
        },
        { spelling: 'côte', glosses: ['Os courbe de la cage thoracique.'] },
      ],
    });
    expect(index['ZESTE']).toMatchObject({ isWord: true });
    expect(index['ZESTE']?.definitionId).toBeUndefined();
  });

  it('écarte les sens form-of sans supprimer les sens nominaux légitimes', async () => {
    const output = await mkdtemp(join(tmpdir(), 'dernier-mot-form-of-'));
    await buildDictionary({
      lexiquePath: fixture('lexique.tsv'),
      wiktionaryPath: fixture('wiktionary.jsonl'),
      sourcesManifestPath: fixture('sources.json'),
      outputDirectory: output,
    });

    const definitions = await readJson<readonly DefinitionEntry[]>(
      join(output, 'definitions', 'P.json'),
    );
    expect(definitions.find((entry) => entry.normalized === 'PORTE')).toEqual({
      normalized: 'PORTE',
      forms: [
        {
          spelling: 'porte',
          glosses: [
            'Ouverture permettant le passage.',
            'Passage fermé par un panneau mobile.',
            'Qualifie les parties du système circulatoire reliant deux réseaux capillaires.',
          ],
        },
      ],
    });
  });

  it('produit les mêmes octets à entrées identiques indépendamment de l’ordre des sources', async () => {
    const first = await mkdtemp(join(tmpdir(), 'dernier-mot-deterministic-a-'));
    const second = await mkdtemp(join(tmpdir(), 'dernier-mot-deterministic-b-'));

    await buildDictionary({
      lexiquePath: fixture('lexique.tsv'),
      wiktionaryPath: fixture('wiktionary.jsonl'),
      sourcesManifestPath: fixture('sources.json'),
      outputDirectory: first,
    });
    await buildDictionary({
      lexiquePath: fixture('lexique.tsv'),
      wiktionaryPath: fixture('wiktionary.jsonl'),
      sourcesManifestPath: fixture('sources-reversed.json'),
      outputDirectory: second,
    });

    expect(await snapshot(second)).toEqual(await snapshot(first));
  });

  it('calcule exactement les descendants stricts et les prochaines lettres', async () => {
    const output = await mkdtemp(join(tmpdir(), 'dernier-mot-prefixes-'));
    await buildDictionary({
      lexiquePath: fixture('lexique.tsv'),
      wiktionaryPath: fixture('wiktionary.jsonl'),
      sourcesManifestPath: fixture('sources.json'),
      outputDirectory: output,
    });

    const index = await readJson<SerializedPrefixIndex>(join(output, 'index.json'));
    expect(index['C']).toEqual({
      isWord: false,
      continuationCount: 4,
      nextLetters: ['A', 'H', 'O'],
    });
    expect(index['CHAT']).toMatchObject({ isWord: true, continuationCount: 0, nextLetters: [] });
  });

  it('construit les préfixes sans rescanner les mots pour chaque nœud', () => {
    let normalizedReads = 0;
    const words = Array.from({ length: 500 }, (_, index) => {
      const suffix = index
        .toString(26)
        .padStart(3, '0')
        .replace(/[0-9a-p]/g, (digit) => String.fromCharCode(65 + Number.parseInt(digit, 26)));
      const normalized = `MOT${suffix}`;
      return {
        get normalized(): string {
          normalizedReads += 1;
          return normalized;
        },
        frequency: index,
      };
    });

    const index = buildPrefixIndex(words, new Set());

    expect(Object.keys(index).length).toBeGreaterThan(words.length);
    expect(normalizedReads).toBeLessThanOrEqual(words.length * 2);
  });

  it.each([
    ['une URL sans hôte', 'https://'],
    ['un protocole non HTTPS', 'http://example.test/source.tsv'],
  ])('rejette %s dans le manifeste source', async (_label, url) => {
    const output = await mkdtemp(join(tmpdir(), 'dernier-mot-source-url-'));
    const sourcesPath = join(output, 'sources.json');
    const sources = JSON.parse(await readFile(fixture('sources.json'), 'utf8')) as {
      sources: Array<Record<string, unknown>>;
    };
    sources.sources[0] = { ...sources.sources[0], url };
    await writeFile(sourcesPath, JSON.stringify(sources));

    await expect(
      buildDictionary({
        lexiquePath: fixture('lexique.tsv'),
        wiktionaryPath: fixture('wiktionary.jsonl'),
        sourcesManifestPath: sourcesPath,
        outputDirectory: output,
      }),
    ).rejects.toThrow(/URL de source invalide/);
  });

  it('rejette une date ISO inexistante dans le manifeste source', async () => {
    const output = await mkdtemp(join(tmpdir(), 'dernier-mot-source-date-'));
    const sourcesPath = join(output, 'sources.json');
    const sources = JSON.parse(await readFile(fixture('sources.json'), 'utf8')) as {
      sources: Array<Record<string, unknown>>;
    };
    sources.sources[0] = { ...sources.sources[0], retrievedAt: '2026-02-30T00:00:00.000Z' };
    await writeFile(sourcesPath, JSON.stringify(sources));

    await expect(
      buildDictionary({
        lexiquePath: fixture('lexique.tsv'),
        wiktionaryPath: fixture('wiktionary.jsonl'),
        sourcesManifestPath: sourcesPath,
        outputDirectory: output,
      }),
    ).rejects.toThrow(/Date de récupération invalide/);
  });
});
