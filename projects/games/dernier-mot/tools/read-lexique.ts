import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { LexiqueEntry } from './types';

const REQUIRED_HEADERS = [['mot', 'ortho'], ['lemme'], ['cgram']] as const;

/** Lit un export TSV Lexique sans le charger entièrement en mémoire. */
export async function* readLexique(path: string): AsyncGenerator<LexiqueEntry> {
  const lines = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let headers: ReadonlyMap<string, number> | undefined;
  let lineNumber = 0;

  for await (const rawLine of lines) {
    lineNumber += 1;
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!headers) {
      const columns = line
        .split('\t')
        .map((column) => column.trim().toLocaleLowerCase('fr-FR').replace(/^\d+_/, ''));
      headers = new Map(columns.map((column, index) => [column, index]));
      const missing = REQUIRED_HEADERS.filter(
        (aliases) => !aliases.some((header) => headers?.has(header)),
      );
      if (missing.length > 0) {
        throw new Error(
          `En-têtes Lexique manquants: ${missing.map((aliases) => aliases.join('/')).join(', ')}`,
        );
      }
      continue;
    }
    if (line.trim() === '') continue;

    const columns = line.split('\t');
    const value = (name: string): string => {
      const index = headers?.get(name);
      return index === undefined ? '' : (columns[index]?.trim() ?? '');
    };
    const valueFrom = (...names: readonly string[]): string => names.map(value).find(Boolean) ?? '';
    const frequencyText = valueFrom(
      'freqlemme',
      'freqlemfilms2',
      'freqlemlivres',
      'freqlivres',
      'freqfilms2',
    );
    const frequency = Number.parseFloat(frequencyText.replace(',', '.'));
    const spelling = valueFrom('mot', 'ortho');
    const lemma = value('lemme');
    const category = value('cgram');
    if (!spelling || !lemma || !category) continue;

    yield {
      spelling,
      lemma,
      category,
      gender: value('genre'),
      number: value('nombre'),
      frequency: Number.isFinite(frequency) ? frequency : 0,
    };
  }

  if (!headers) throw new Error('Fichier Lexique vide');
}
