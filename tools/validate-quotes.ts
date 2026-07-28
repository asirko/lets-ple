import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, type Quote } from './quote-schema';

const MIN_ALPHA_LENGTH = 15;

function countAlpha(text: string): number {
  return [...text].filter((c) => /\p{L}/u.test(c)).length;
}

/** Valide un corpus de citations. Retourne les messages d'erreur, vide si tout est valide. */
export function validateQuotes(quotes: unknown[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  quotes.forEach((raw, index) => {
    const quote = raw as Partial<Quote>;
    const label = typeof quote.id === 'string' && quote.id !== '' ? quote.id : `#${index}`;

    if (typeof quote.id !== 'string' || quote.id === '') {
      errors.push(`${label}: id manquant ou vide`);
    } else if (seenIds.has(quote.id)) {
      errors.push(`${label}: id dupliqué dans le corpus`);
    } else {
      seenIds.add(quote.id);
    }

    if (typeof quote.text !== 'string' || countAlpha(quote.text) < MIN_ALPHA_LENGTH) {
      errors.push(`${label}: text absent ou trop court (< ${MIN_ALPHA_LENGTH} caractères alphabétiques)`);
    }

    if (typeof quote.author !== 'string' || quote.author.trim() === '') {
      errors.push(`${label}: author manquant ou vide`);
    }

    if (typeof quote.source !== 'string' || quote.source.trim() === '') {
      errors.push(`${label}: source manquant ou vide`);
    }

    if (typeof quote.theme !== 'string' || !THEMES.includes(quote.theme as Quote['theme'])) {
      errors.push(`${label}: theme invalide (attendu : ${THEMES.join(', ')})`);
    }

    if (
      typeof quote.notoriety !== 'number' ||
      !Number.isInteger(quote.notoriety) ||
      quote.notoriety < 1 ||
      quote.notoriety > 5
    ) {
      errors.push(`${label}: notoriety doit être un entier entre 1 et 5`);
    }

    if (typeof quote.publicDomain !== 'boolean') {
      errors.push(`${label}: publicDomain doit être un booléen`);
    }
  });

  return errors;
}

function loadCorpus(dir: string): unknown[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

function isMainModule(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const corpusDir = join(process.cwd(), 'content', 'quotes');
  const errors = validateQuotes(loadCorpus(corpusDir));

  if (errors.length > 0) {
    console.error(`${errors.length} erreur(s) dans le corpus :`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log('Corpus valide.');
}
