import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeWord } from '../src/lib/domain/normalize-word';
import { readLexique } from './read-lexique';
import { readWiktionary } from './read-wiktionary';
import { isStrictHttpsUrl, isStrictRfc3339 } from './source-metadata';
import type {
  DefinitionEntry,
  DictionaryManifest,
  DictionarySource,
  DictionarySourceInput,
  LexiqueEntry,
  SerializedPrefixIndex,
  SerializedPrefixNode,
} from './types';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const ACCEPTED_CATEGORIES = new Set(['NOM', 'ADJ', 'VER', 'ADV']);
const ACCEPTED_POS = new Set(['noun', 'adj', 'verb', 'adv']);
const SOURCE_ORDER = new Map([
  ['Lexique 4', 0],
  ['Wiktionnaire', 1],
]);
const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';
const SOURCE_ATTRIBUTION = {
  'Lexique 4': {
    creators: [
      'Boris New',
      'Christophe Pallier',
      'Gauvain Schalchli',
      'Jessica Bourgin',
      'Manuel Gimenes',
    ],
    licenseUrl: LICENSE_URL,
    citation: {
      text: 'New, B., Pallier, C., Schalchli, G., Bourgin, J., & Gimenes, M. (2026). Lexique 4: A major upgrade of the Lexique French lexical database. Behavior Research Methods, 58(5), Article 140.',
      url: 'https://doi.org/10.3758/s13428-026-02967-5',
    },
  },
  Wiktionnaire: {
    creators: ['Contributeurs du Wiktionnaire en français'],
    licenseUrl: LICENSE_URL,
    attributionUrl:
      'https://fr.wiktionary.org/wiki/Wiktionnaire:R%C3%A9utilisation_du_contenu_du_Wiktionnaire',
    articleUrlTemplate: 'https://fr.wiktionary.org/wiki/{title}',
    contributorsUrlTemplate: 'https://fr.wiktionary.org/w/index.php?title={title}&action=history',
    extractor: {
      name: 'Wiktextract',
      creator: 'Tatu Ylonen',
      url: 'https://github.com/tatuylonen/wiktextract',
      license: 'MIT',
      licenseUrl: 'https://github.com/tatuylonen/wiktextract/blob/master/LICENSE',
    },
  },
} as const;
const ADAPTATION = {
  license: 'CC-BY-SA-4.0',
  licenseUrl: LICENSE_URL,
  notice:
    'Corpus dérivé : sélection de lemmes, exclusion des formes fléchies et graphies non alphabétiques, normalisation de la casse, des accents et des ligatures, fusion des homographes normalisés, construction d’un index de préfixes et découpage des définitions par initiale.',
} as const;

export interface BuildDictionaryOptions {
  readonly lexiquePath: string;
  readonly wiktionaryPath: string;
  readonly sourcesManifestPath: string;
  readonly outputDirectory?: string;
}

export interface WordCandidate {
  readonly normalized: string;
  readonly frequency: number;
}

interface MutablePrefixNode {
  continuationCount: number;
  readonly nextLetters: Set<string>;
}

interface MutableForm {
  readonly spelling: string;
  readonly glosses: Set<string>;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isAlphabeticWord(value: string): boolean {
  return (
    /^\p{L}+$/u.test(value) &&
    normalizeWord(value).length >= 3 &&
    /^[A-Z]+$/.test(normalizeWord(value))
  );
}

function isCanonicalLexiqueEntry(entry: LexiqueEntry): boolean {
  if (!ACCEPTED_CATEGORIES.has(entry.category)) return false;
  if (!isAlphabeticWord(entry.spelling) || !isAlphabeticWord(entry.lemma)) return false;
  if (entry.spelling !== entry.spelling.toLocaleLowerCase('fr-FR')) return false;
  if (normalizeWord(entry.spelling) !== normalizeWord(entry.lemma)) return false;
  if (entry.category === 'NOM') return entry.number === 's' || entry.number === 'i';
  if (entry.category === 'ADJ') return true;
  return true;
}

function isUnmarkedInflectionGloss(gloss: string): boolean {
  return (
    /^(?:(?:ou )?variante de [^,]+,\s*)?(?:première|deuxième|troisième) personne\b.*\b(?:singulier|pluriel|indicatif|subjonctif|impératif|conditionnel|passé simple|présent)\b/iu.test(
      gloss,
    ) ||
    /^participe (?:passé|présent)(?:\s|$)/iu.test(gloss) ||
    /^forme (?:fléchie|conjuguée)\b/iu.test(gloss)
  );
}

async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

function assertSourceInput(value: unknown): asserts value is DictionarySourceInput {
  if (typeof value !== 'object' || value === null) throw new Error('Métadonnée de source invalide');
  const source = value as Partial<DictionarySourceInput>;
  if (!SOURCE_ORDER.has(source.name ?? ''))
    throw new Error(`Nom de source invalide: ${String(source.name)}`);
  if (!isStrictHttpsUrl(source.url)) throw new Error('URL de source invalide');
  if (!isStrictRfc3339(source.retrievedAt)) throw new Error('Date de récupération invalide');
  if (source.license !== 'CC-BY-SA-4.0') throw new Error('Licence de source invalide');
}

async function readSources(
  manifestPath: string,
  lexiquePath: string,
  wiktionaryPath: string,
): Promise<readonly DictionarySource[]> {
  const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as { readonly sources?: unknown };
  if (!Array.isArray(parsed.sources) || parsed.sources.length !== 2) {
    throw new Error('Le manifeste des sources doit décrire exactement deux sources');
  }
  parsed.sources.forEach(assertSourceInput);
  const names = new Set(parsed.sources.map((source) => source.name));
  if (names.size !== 2) throw new Error('Les deux sources attendues doivent être uniques');

  const hashes = new Map([
    ['Lexique 4', await sha256(lexiquePath)],
    ['Wiktionnaire', await sha256(wiktionaryPath)],
  ]);
  return parsed.sources
    .map((source) => ({
      ...source,
      ...SOURCE_ATTRIBUTION[source.name],
      sha256: hashes.get(source.name) ?? '',
    }))
    .sort(
      (left, right) => (SOURCE_ORDER.get(left.name) ?? 99) - (SOURCE_ORDER.get(right.name) ?? 99),
    );
}

export function buildPrefixIndex(
  words: readonly WordCandidate[],
  definitionIds: ReadonlySet<string>,
): SerializedPrefixIndex {
  const stableWords = words.map((word) => ({
    normalized: word.normalized,
    frequency: word.frequency,
  }));
  const fullWords = new Map(stableWords.map((word) => [word.normalized, word]));
  const prefixes = new Map<string, MutablePrefixNode>();
  for (const word of stableWords) {
    for (let length = 1; length <= word.normalized.length; length += 1) {
      const prefix = word.normalized.slice(0, length);
      const node = prefixes.get(prefix) ?? { continuationCount: 0, nextLetters: new Set<string>() };
      if (length < word.normalized.length) {
        node.continuationCount += 1;
        node.nextLetters.add(word.normalized[length] ?? '');
      }
      prefixes.set(prefix, node);
    }
  }

  const result: Record<string, SerializedPrefixNode> = {};
  for (const prefix of [...prefixes.keys()].sort(compareText)) {
    const accumulated = prefixes.get(prefix);
    if (!accumulated) continue;
    const word = fullWords.get(prefix);
    result[prefix] = {
      isWord: word !== undefined,
      continuationCount: accumulated.continuationCount,
      nextLetters: [...accumulated.nextLetters].sort(compareText),
      ...(word ? { frequency: word.frequency } : {}),
      ...(word && definitionIds.has(prefix) ? { definitionId: prefix } : {}),
    };
  }
  return result;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function buildDictionary(
  options: BuildDictionaryOptions,
): Promise<DictionaryManifest> {
  const outputDirectory = options.outputDirectory ?? resolve('content/dictionaries/dernier-mot');
  const sources = await readSources(
    options.sourcesManifestPath,
    options.lexiquePath,
    options.wiktionaryPath,
  );
  const wordsByNormalized = new Map<string, WordCandidate>();
  for await (const entry of readLexique(options.lexiquePath)) {
    if (!isCanonicalLexiqueEntry(entry)) continue;
    const normalized = normalizeWord(entry.lemma);
    const previous = wordsByNormalized.get(normalized);
    if (!previous || entry.frequency > previous.frequency) {
      wordsByNormalized.set(normalized, { normalized, frequency: entry.frequency });
    }
  }

  const formsByNormalized = new Map<string, Map<string, MutableForm>>();
  for await (const entry of readWiktionary(options.wiktionaryPath)) {
    if (!ACCEPTED_POS.has(entry.pos) || !isAlphabeticWord(entry.word)) continue;
    if (entry.word !== entry.word.toLocaleLowerCase('fr-FR')) continue;
    const normalized = normalizeWord(entry.word);
    if (!wordsByNormalized.has(normalized)) continue;
    const forms = formsByNormalized.get(normalized) ?? new Map<string, MutableForm>();
    const form = forms.get(entry.word) ?? { spelling: entry.word, glosses: new Set<string>() };
    entry.senses
      .filter((sense) => !sense.tags.includes('form-of') && sense.formOf.length === 0)
      .flatMap((sense) => sense.glosses)
      .filter((gloss) => !isUnmarkedInflectionGloss(gloss))
      .forEach((gloss) => form.glosses.add(gloss));
    if (form.glosses.size === 0) continue;
    forms.set(entry.word, form);
    formsByNormalized.set(normalized, forms);
  }

  const definitions = [...formsByNormalized.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map<DefinitionEntry>(([normalized, forms]) => ({
      normalized,
      forms: [...forms.values()]
        .sort((left, right) => compareText(left.spelling, right.spelling))
        .map((form) => ({ spelling: form.spelling, glosses: [...form.glosses].sort(compareText) })),
    }));
  const words = [...wordsByNormalized.values()].sort((left, right) =>
    compareText(left.normalized, right.normalized),
  );
  const index = buildPrefixIndex(words, new Set(definitions.map((entry) => entry.normalized)));
  const manifest: DictionaryManifest = {
    schemaVersion: 1,
    generatedAt: new Date(
      Math.max(...sources.map((source) => Date.parse(source.retrievedAt))),
    ).toISOString(),
    entryCount: words.length,
    sources,
    adaptation: ADAPTATION,
  };

  await mkdir(resolve(outputDirectory, 'definitions'), { recursive: true });
  await writeJson(resolve(outputDirectory, 'manifest.json'), manifest);
  await writeJson(resolve(outputDirectory, 'index.json'), index);
  for (const initial of ALPHABET) {
    await writeJson(
      resolve(outputDirectory, 'definitions', `${initial}.json`),
      definitions.filter((entry) => entry.normalized.startsWith(initial)),
    );
  }
  return manifest;
}

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`Argument requis: ${name}`);
  return value;
}

async function main(): Promise<void> {
  const manifest = await buildDictionary({
    lexiquePath: argument('--lexique'),
    wiktionaryPath: argument('--wiktionary'),
    sourcesManifestPath: argument('--sources-manifest'),
  });
  console.log(`Dictionnaire généré: ${manifest.entryCount} entrées`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
