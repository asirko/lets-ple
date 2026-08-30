import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeWord } from '../src/lib/domain/normalize-word';
import { isStrictHttpsUrl, isStrictRfc3339 } from './source-metadata';
import type {
  DefinitionEntry,
  DictionaryManifest,
  DictionaryValidationReport,
  SerializedPrefixIndex,
  SerializedPrefixNode,
  ValidationFile,
} from './types';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

interface MutablePrefixFacts {
  continuationCount: number;
  readonly nextLetters: Set<string>;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSorted(values: readonly string[], label: string): void {
  if (
    values.some((value, index) => index > 0 && compareText(values[index - 1] ?? '', value) >= 0)
  ) {
    throw new Error(`${label} n'est pas strictement trié`);
  }
}

function assertManifest(value: unknown): asserts value is DictionaryManifest {
  if (typeof value !== 'object' || value === null) throw new Error('manifest.json invalide');
  const manifest = value as Partial<DictionaryManifest>;
  if (manifest.schemaVersion !== 1) throw new Error('schemaVersion invalide');
  if (!Number.isInteger(manifest.entryCount) || (manifest.entryCount ?? -1) < 0)
    throw new Error('entryCount invalide');
  if (!isStrictRfc3339(manifest.generatedAt)) {
    throw new Error('generatedAt invalide');
  }
  if (!Array.isArray(manifest.sources) || manifest.sources.length !== 2)
    throw new Error('sources invalides');
  const expectedNames = ['Lexique 4', 'Wiktionnaire'];
  manifest.sources.forEach((source, index) => {
    if (source.name !== expectedNames[index]) throw new Error(`source ${index} invalide`);
    if (!isStrictHttpsUrl(source.url)) throw new Error(`URL de source invalide: ${source.name}`);
    if (!isStrictRfc3339(source.retrievedAt))
      throw new Error(`retrievedAt invalide: ${source.name}`);
    if (!/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error(`sha256 invalide: ${source.name}`);
    if (source.license !== 'CC-BY-SA-4.0') throw new Error(`licence invalide: ${source.name}`);
    if (
      source.licenseUrl !== 'https://creativecommons.org/licenses/by-sa/4.0/' ||
      !Array.isArray(source.creators) ||
      source.creators.length === 0 ||
      source.creators.some((creator) => typeof creator !== 'string' || creator.trim() === '')
    ) {
      throw new Error(`attribution invalide: ${source.name}`);
    }
    if (source.name === 'Lexique 4') {
      if (
        !source.creators.includes('Boris New') ||
        !source.creators.includes('Christophe Pallier') ||
        !source.citation ||
        typeof source.citation.text !== 'string' ||
        source.citation.text.trim() === '' ||
        !isStrictHttpsUrl(source.citation.url)
      ) {
        throw new Error('attribution invalide: Lexique 4');
      }
    }
    if (source.name === 'Wiktionnaire') {
      const extractor = source.extractor;
      if (
        !isStrictHttpsUrl(source.attributionUrl ?? '') ||
        source.articleUrlTemplate !== 'https://fr.wiktionary.org/wiki/{title}' ||
        source.contributorsUrlTemplate !==
          'https://fr.wiktionary.org/w/index.php?title={title}&action=history' ||
        !extractor ||
        extractor.name !== 'Wiktextract' ||
        extractor.creator !== 'Tatu Ylonen' ||
        extractor.license !== 'MIT' ||
        !isStrictHttpsUrl(extractor.url) ||
        !isStrictHttpsUrl(extractor.licenseUrl)
      ) {
        throw new Error('attribution invalide: Wiktionnaire');
      }
    }
  });
  const adaptation = manifest.adaptation;
  if (
    !adaptation ||
    adaptation.license !== 'CC-BY-SA-4.0' ||
    adaptation.licenseUrl !== 'https://creativecommons.org/licenses/by-sa/4.0/' ||
    typeof adaptation.notice !== 'string' ||
    adaptation.notice.trim() === ''
  ) {
    throw new Error('adaptation invalide');
  }
}

function assertNode(prefix: string, value: unknown): asserts value is SerializedPrefixNode {
  if (typeof value !== 'object' || value === null) throw new Error(`Nœud invalide: ${prefix}`);
  const node = value as Partial<SerializedPrefixNode>;
  if (typeof node.isWord !== 'boolean') throw new Error(`isWord invalide: ${prefix}`);
  if (!Number.isInteger(node.continuationCount) || (node.continuationCount ?? -1) < 0) {
    throw new Error(`continuationCount invalide: ${prefix}`);
  }
  if (
    !Array.isArray(node.nextLetters) ||
    node.nextLetters.some((letter) => !/^[A-Z]$/.test(letter))
  ) {
    throw new Error(`nextLetters invalide: ${prefix}`);
  }
  assertSorted(node.nextLetters, `nextLetters de ${prefix}`);
  if (node.frequency !== undefined && (!Number.isFinite(node.frequency) || node.frequency < 0)) {
    throw new Error(`frequency invalide: ${prefix}`);
  }
  if (node.definitionId !== undefined && !/^[A-Z]{3,}$/.test(node.definitionId)) {
    throw new Error(`definitionId invalide: ${prefix}`);
  }
}

function assertDefinition(entry: unknown, initial: string): asserts entry is DefinitionEntry {
  if (typeof entry !== 'object' || entry === null)
    throw new Error(`Définition invalide dans ${initial}.json`);
  const definition = entry as Partial<DefinitionEntry>;
  if (
    typeof definition.normalized !== 'string' ||
    !new RegExp(`^${initial}[A-Z]{2,}$`).test(definition.normalized)
  ) {
    throw new Error(`Clé de définition invalide dans ${initial}.json`);
  }
  if (!Array.isArray(definition.forms) || definition.forms.length === 0) {
    throw new Error(`Formes absentes pour ${definition.normalized}`);
  }
  for (const form of definition.forms) {
    if (
      typeof form.spelling !== 'string' ||
      !/^\p{L}+$/u.test(form.spelling) ||
      form.spelling !== form.spelling.toLocaleLowerCase('fr-FR') ||
      normalizeWord(form.spelling) !== definition.normalized
    ) {
      throw new Error(`graphie inadmissible: ${String(form.spelling)}`);
    }
    if (
      !Array.isArray(form.glosses) ||
      form.glosses.length === 0 ||
      form.glosses.some((gloss: string) => typeof gloss !== 'string' || !gloss.trim())
    ) {
      throw new Error(`Gloses invalides pour ${form.spelling}`);
    }
    assertSorted(form.glosses, `gloses de ${form.spelling}`);
  }
  assertSorted(
    definition.forms.map((form) => form.spelling),
    `graphies de ${definition.normalized}`,
  );
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function fileSize(directory: string, name: string): Promise<ValidationFile> {
  return { name, bytes: (await stat(resolve(directory, name))).size };
}

async function assertExpectedFiles(directory: string): Promise<void> {
  const rootExpected = new Map([
    ['manifest.json', 'file'],
    ['index.json', 'file'],
    ['definitions', 'directory'],
  ]);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const expectedType = rootExpected.get(entry.name);
    const actualType = entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other';
    if (expectedType !== actualType) throw new Error(`fichier inattendu: ${entry.name}`);
    rootExpected.delete(entry.name);
  }
  if (rootExpected.size > 0) throw new Error(`fichier manquant: ${[...rootExpected.keys()][0]}`);

  const definitionExpected = new Set(ALPHABET.map((initial) => `${initial}.json`));
  for (const entry of await readdir(resolve(directory, 'definitions'), { withFileTypes: true })) {
    if (!entry.isFile() || !definitionExpected.delete(entry.name)) {
      throw new Error(`fichier inattendu: ${entry.name}`);
    }
  }
  if (definitionExpected.size > 0) {
    throw new Error(`fichier manquant: definitions/${[...definitionExpected][0]}`);
  }
}

export async function validateDictionary(
  directory = resolve('content/dictionaries/dernier-mot'),
): Promise<DictionaryValidationReport> {
  await assertExpectedFiles(directory);
  const manifestValue = await readJson(resolve(directory, 'manifest.json'));
  assertManifest(manifestValue);
  const indexValue = await readJson(resolve(directory, 'index.json'));
  if (typeof indexValue !== 'object' || indexValue === null || Array.isArray(indexValue)) {
    throw new Error('index.json invalide');
  }
  const index = indexValue as SerializedPrefixIndex;
  const prefixes = Object.keys(index);
  assertSorted(prefixes, 'clés de index.json');
  if (prefixes.some((prefix) => !/^[A-Z]+$/.test(prefix)))
    throw new Error('Graphie inadmissible dans index.json');
  for (const prefix of prefixes) assertNode(prefix, index[prefix]);

  const definitions = new Map<string, DefinitionEntry>();
  for (const initial of ALPHABET) {
    const value = await readJson(resolve(directory, 'definitions', `${initial}.json`));
    if (!Array.isArray(value)) throw new Error(`definitions/${initial}.json invalide`);
    value.forEach((entry) => assertDefinition(entry, initial));
    assertSorted(
      value.map((entry) => entry.normalized),
      `definitions/${initial}.json`,
    );
    for (const entry of value) {
      if (definitions.has(entry.normalized))
        throw new Error(`Définition dupliquée: ${entry.normalized}`);
      definitions.set(entry.normalized, entry);
    }
  }

  const words = prefixes.filter((prefix) => index[prefix]?.isWord);
  if (words.length !== manifestValue.entryCount) {
    throw new Error(`entryCount attendu ${words.length}, reçu ${manifestValue.entryCount}`);
  }
  if (words.some((word) => word.length < 3))
    throw new Error('Mot de moins de trois lettres dans index.json');
  const expectedPrefixes = new Map<string, MutablePrefixFacts>();
  for (const word of words) {
    for (let length = 1; length <= word.length; length += 1) {
      const prefix = word.slice(0, length);
      const facts = expectedPrefixes.get(prefix) ?? {
        continuationCount: 0,
        nextLetters: new Set<string>(),
      };
      if (length < word.length) {
        facts.continuationCount += 1;
        facts.nextLetters.add(word[length] ?? '');
      }
      expectedPrefixes.set(prefix, facts);
    }
  }
  for (const expectedPrefix of expectedPrefixes.keys()) {
    if (!index[expectedPrefix]) throw new Error(`préfixe manquant: ${expectedPrefix}`);
  }
  for (const prefix of prefixes) {
    if (!expectedPrefixes.has(prefix)) throw new Error(`préfixe superflu: ${prefix}`);
  }
  for (const prefix of prefixes) {
    const node = index[prefix];
    if (!node) continue;
    const expected = expectedPrefixes.get(prefix);
    if (!expected) continue;
    if (node.continuationCount !== expected.continuationCount) {
      throw new Error(`continuationCount incorrect pour ${prefix}: ${node.continuationCount}`);
    }
    const nextLetters = [...expected.nextLetters].sort(compareText);
    if (JSON.stringify(node.nextLetters) !== JSON.stringify(nextLetters)) {
      throw new Error(`nextLetters incorrect pour ${prefix}`);
    }
    if (node.isWord && node.frequency === undefined)
      throw new Error(`frequency absente pour ${prefix}`);
    if (!node.isWord && (node.frequency !== undefined || node.definitionId !== undefined)) {
      throw new Error(`Métadonnée de mot sur le préfixe ${prefix}`);
    }
    if (node.definitionId !== undefined) {
      if (node.definitionId !== prefix || !definitions.has(node.definitionId)) {
        throw new Error(`definitionId absent ou incohérent: ${node.definitionId}`);
      }
    }
  }
  for (const definitionId of definitions.keys()) {
    if (index[definitionId]?.definitionId !== definitionId)
      throw new Error(`Définition non référencée: ${definitionId}`);
  }

  const names = [
    'manifest.json',
    'index.json',
    ...ALPHABET.map((initial) => `definitions/${initial}.json`),
  ];
  const files = await Promise.all(names.map((name) => fileSize(directory, name)));
  return { entryCount: words.length, files };
}

async function main(): Promise<void> {
  const report = await validateDictionary();
  console.log(`Dictionnaire valide: ${report.entryCount} entrées`);
  for (const file of report.files) console.log(`${file.name}: ${file.bytes} octets`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
