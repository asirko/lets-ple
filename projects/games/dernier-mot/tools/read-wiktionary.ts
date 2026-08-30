import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import type { WiktionaryEntry } from './types';

interface WiktextractSense {
  readonly glosses?: unknown;
  readonly tags?: unknown;
  readonly form_of?: unknown;
}

interface WiktextractFormOf {
  readonly word?: unknown;
}

interface WiktextractRecord {
  readonly lang_code?: unknown;
  readonly word?: unknown;
  readonly pos?: unknown;
  readonly senses?: unknown;
}

/** Lit un dump JSONL Wiktextract et projette seulement les champs nécessaires au générateur. */
export async function* readWiktionary(path: string): AsyncGenerator<WiktionaryEntry> {
  const file = createReadStream(path);
  const input = path.toLocaleLowerCase('en-US').endsWith('.gz') ? file.pipe(createGunzip()) : file;
  input.setEncoding('utf8');
  const lines = createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  let pending = '';
  let pendingLineNumber = 0;

  for await (const line of lines) {
    lineNumber += 1;
    if (line.trim() === '') continue;
    const candidate = pending ? `${pending}\\n${line}` : line;
    let record: WiktextractRecord;
    try {
      record = JSON.parse(candidate) as WiktextractRecord;
    } catch {
      if (!pending) pendingLineNumber = lineNumber;
      pending = candidate;
      if (pending.length > 10_000_000) {
        throw new Error(`JSON Wiktionnaire invalide à la ligne ${pendingLineNumber}`);
      }
      continue;
    }
    pending = '';
    pendingLineNumber = 0;
    if (
      record.lang_code !== 'fr' ||
      typeof record.word !== 'string' ||
      typeof record.pos !== 'string'
    )
      continue;
    if (!Array.isArray(record.senses)) continue;

    const senses = record.senses
      .map((sense: WiktextractSense) => ({
        glosses: Array.isArray(sense.glosses)
          ? sense.glosses
              .filter((gloss): gloss is string => typeof gloss === 'string' && gloss.trim() !== '')
              .map((gloss) => gloss.trim())
          : [],
        tags: Array.isArray(sense.tags)
          ? sense.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
        formOf: Array.isArray(sense.form_of)
          ? sense.form_of
              .filter(
                (form): form is WiktextractFormOf =>
                  typeof form === 'object' && form !== null && typeof form.word === 'string',
              )
              .map((form) => form.word as string)
          : [],
      }))
      .filter((sense) => sense.glosses.length > 0);
    if (senses.length === 0) continue;
    yield { word: record.word, pos: record.pos, senses };
  }

  if (pending) throw new Error(`JSON Wiktionnaire invalide à la ligne ${pendingLineNumber}`);
}
