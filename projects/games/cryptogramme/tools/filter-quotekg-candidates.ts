/**
 * Filtre le dump brut de `extract-quotekg-citations.ts` par score de qualité et écrit le résultat
 * dans `content/quote-candidates/quotekg.json`, un fichier versionné (contrairement au dump brut,
 * gitignored).
 *
 * `quality` est calculé par `score-quotekg-citations` (voir CLAUDE.md), un score 0-1 attribué par
 * lots via des agents Haiku : 1 = citation parfaite, 0.5 = texte encore parasité par des symboles
 * ou résidus de balisage, 0 = incompréhensible ou manifestement pas en français. En dessous de 0.7,
 * l'échantillonnage manuel a montré presque exclusivement du bruit (latin mal étiqueté, titres
 * d'œuvres, fragments tronqués, noms propres) ou du français médiéval trop difficile à jouer.
 *
 * Ce fichier reste un candidat, pas un corpus prêt à l'emploi : `theme`, `notoriety` et
 * `publicDomain` n'existent dans aucune source automatisée et restent à trancher à la main avant
 * qu'une entrée rejoigne `content/quotes/` (voir `quote-schema.ts` / `validate-quotes.ts`).
 *
 * Usage : npm run filter:quotes -- [--min-quality 0.7] [--input fichier.json] [--output fichier.json]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_INPUT = 'quotekg-citations.json';
const DEFAULT_OUTPUT = 'content/quote-candidates/quotekg.json';
const DEFAULT_MIN_QUALITY = 0.7;

interface ScoredQuote {
  author: string;
  text: string;
  context: string | null;
  sourceUrl: string;
  quality: number;
}

/** Ne garde que les citations dont le score de qualité atteint le seuil (voir en-tête pour le pourquoi de 0.7). */
export function filterCandidates(quotes: ScoredQuote[], minQuality: number): ScoredQuote[] {
  return quotes.filter((q) => q.quality >= minQuality);
}

interface CliArgs {
  input: string;
  output: string;
  minQuality: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    minQuality: DEFAULT_MIN_QUALITY,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') {
      args.input = argv[++i];
    } else if (arg === '--output') {
      args.output = argv[++i];
    } else if (arg === '--min-quality') {
      args.minQuality = parseFloat(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: [--min-quality 0.7] [--input fichier.json] [--output fichier.json]');
      process.exit(0);
    }
  }
  return args;
}

function isMainModule(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const args = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(readFileSync(args.input, 'utf-8'));
  const kept = filterCandidates(raw.quotes, args.minQuality);

  const output = {
    meta: {
      ...raw.meta,
      minQuality: args.minQuality,
      candidateCount: kept.length,
      totalBeforeFilter: raw.quotes.length,
    },
    quotes: kept,
  };

  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  console.log(
    `${kept.length}/${raw.quotes.length} citations retenues (quality >= ${args.minQuality}).`,
  );
  console.log(`Fichier: ${args.output}`);
}
