/**
 * Extraction de citations en français depuis QuoteKG (https://quotekg.l3s.uni-hannover.de), un
 * graphe de connaissances académique dérivé de Wikiquote (~1M citations, 55 langues).
 *
 * POURQUOI QUOTEKG PLUTÔT QUE SCRAPER fr.wikiquote.org DIRECTEMENT
 * ------------------------------------------------------------------
 * Une première tentative parsait le wikitexte brut des pages Wikiquote : le résultat mélangeait
 * citations, commentaires éditoriaux et résidus de balisage, avec un taux de bruit élevé. QuoteKG
 * a déjà fait ce travail de structuration (texte de citation séparé du contexte, langue taguée
 * explicitement via `xml:lang`, source retracée jusqu'à la page Wikiquote d'origine) — sur un
 * échantillon vérifié, moins de 0,3 % des entrées gardent encore un résidu de balisage.
 *
 * Ce script ne produit toujours PAS des `Quote` prêtes à l'emploi (voir `./quote-schema.ts`) :
 * `theme`, `notoriety` et `publicDomain` n'existent dans aucune source automatisée et restent à
 * trancher à la main avant d'ajouter une entrée à `content/quotes/`.
 *
 * Aucune limite de longueur n'est appliquée : les citations très longues sont conservées (elles
 * font des cryptogrammes plus difficiles, ce qui est recherché). Seule la source est filtrée :
 * une vérification a montré que les mentions taguées `fr` mais hébergées sur un Wikiquote dans une
 * autre langue (bulgare, italien, néerlandais, japonais, latin...) sont nettement plus souvent mal
 * étiquetées (ex. un discours en anglais tagué `fr`) — on ne garde donc que les mentions dont la
 * page source est sur `fr.wikiquote.org` ou `en.wikiquote.org`.
 *
 * LICENCE DES DONNÉES : QuoteKG est distribué sous CC BY 4.0 (voir https://zenodo.org/record/4702545) ;
 * le contenu reste dérivé de Wikiquote (CC BY-SA), donc l'attribution à Wikiquote/Wikimedia reste
 * de mise. Comme pour Wikiquote, le texte d'une citation d'un auteur mort depuis plus de 70 ans
 * (règle générale en France) est par ailleurs dans le domaine public indépendamment de cette
 * licence de compilation.
 *
 * Usage (Node 18+, aucune dépendance npm requise) :
 *   npm run extract:quotes
 *   npx tsx projects/games/cryptogramme/tools/extract-quotekg-citations.ts --lang fr
 *   npx tsx projects/games/cryptogramme/tools/extract-quotekg-citations.ts --max-results 200   # échantillon rapide
 *
 * Le résultat est écrit progressivement dans le fichier de sortie : interruption (Ctrl+C) et
 * reprise sans perte, les citations déjà présentes (par texte normalisé) étant sautées.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { countAlpha, MIN_ALPHA_LENGTH } from './validate-quotes';

const SPARQL_ENDPOINT = 'https://quotekg.l3s.uni-hannover.de/sparql';
const DEFAULT_OUTPUT_FILE = 'quotekg-citations.json';
const REQUEST_DELAY_MS = 300; // être poli avec un serveur académique, pas d'API commerciale derrière
const ALLOWED_SOURCE_HOSTS = new Set(['fr.wikiquote.org', 'en.wikiquote.org']);

/** Citation brute extraite de QuoteKG, avant curation vers le schéma `Quote` du corpus. */
interface RawQuote {
  author: string;
  text: string;
  context: string | null;
  sourceUrl: string;
}

interface ExtractionState {
  meta: Record<string, unknown>;
  quotes: RawQuote[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(lang: string, limit: number, offset: number): string {
  return `
PREFIX so: <https://schema.org/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX qkg: <https://quotekg.l3s.uni-hannover.de/resource/>

SELECT ?text ?personLabel ?sourceUrl (GROUP_CONCAT(DISTINCT ?desc; separator=" | ") AS ?context)
WHERE {
  ?quotation a so:Quotation ;
             so:spokenByCharacter ?person ;
             qkg:hasMention ?mention .
  ?person skos:prefLabel ?personLabel .
  ?mention so:text ?text ;
           so:isPartOf ?sourceUrl .
  OPTIONAL { ?mention so:description ?desc }
  FILTER(lang(?text) = "${lang}")
}
GROUP BY ?text ?personLabel ?sourceUrl
ORDER BY ?text
LIMIT ${limit}
OFFSET ${offset}
`.trim();
}

interface SparqlBinding {
  text: { value: string };
  personLabel: { value: string };
  sourceUrl: { value: string };
  context?: { value: string };
}

async function fetchPage(lang: string, limit: number, offset: number): Promise<SparqlBinding[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', buildQuery(lang, limit, offset));
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} depuis l'endpoint SPARQL`);
  const data = await res.json();
  return data.results.bindings;
}

const RESIDUAL_MARKUP_RE = /<[^>]+>|\{\{[^}]*\}\}/g;
const WIKILINK_RE = /\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g;

/** Nettoie les rares résidus de balisage encore présents dans le texte QuoteKG et aplatit les sauts de ligne. */
export function cleanQuoteText(raw: string): string {
  let out = raw.replace(RESIDUAL_MARKUP_RE, '');
  out = out.replace(WIKILINK_RE, '$1');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

/** Un fragment n'est pas une citation jouable ; aucune limite haute, les très longues sont voulues. */
export function isAcceptableQuote(text: string): boolean {
  return countAlpha(text) >= MIN_ALPHA_LENGTH;
}

/** N'accepte que les mentions dont la page source est sur un Wikiquote fr ou en (voir en-tête). */
export function isAllowedSource(sourceUrl: string): boolean {
  try {
    return ALLOWED_SOURCE_HOSTS.has(new URL(sourceUrl).hostname);
  } catch {
    return false;
  }
}

function bindingToRawQuote(binding: SparqlBinding): RawQuote | null {
  if (!isAllowedSource(binding.sourceUrl.value)) return null;
  const text = cleanQuoteText(binding.text.value);
  if (!isAcceptableQuote(text)) return null;
  return {
    author: binding.personLabel.value,
    text,
    context: binding.context?.value?.trim() || null,
    sourceUrl: binding.sourceUrl.value,
  };
}

function loadExisting(path: string): ExtractionState {
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      // fichier corrompu ou absent : on repart de zéro
    }
  }
  return { meta: {}, quotes: [] };
}

function save(path: string, data: ExtractionState): void {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

interface CliArgs {
  output: string;
  lang: string;
  batchSize: number;
  maxResults?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    output: DEFAULT_OUTPUT_FILE,
    lang: 'fr',
    batchSize: 500,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--output') {
      args.output = argv[++i];
    } else if (arg === '--lang') {
      args.lang = argv[++i];
    } else if (arg === '--batch-size') {
      args.batchSize = parseInt(argv[++i], 10);
    } else if (arg === '--max-results') {
      args.maxResults = parseInt(argv[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: [--lang fr] [--batch-size N] [--max-results N] [--output fichier.json]');
      process.exit(0);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const data = loadExisting(args.output);
  const seen = new Set(data.quotes.map((q) => q.text.toLowerCase()));

  let offset = 0;
  let rejected = 0;
  console.log(`Interrogation de QuoteKG (langue='${args.lang}')...`);

  while (!args.maxResults || data.quotes.length < args.maxResults) {
    const limit = args.maxResults
      ? Math.min(args.batchSize, args.maxResults - data.quotes.length)
      : args.batchSize;
    const bindings = await fetchPage(args.lang, limit, offset);
    if (bindings.length === 0) break;

    for (const binding of bindings) {
      const quote = bindingToRawQuote(binding);
      if (!quote) {
        rejected++;
        continue;
      }
      const key = quote.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      data.quotes.push(quote);
    }

    offset += bindings.length;
    data.meta = {
      source: 'QuoteKG (https://quotekg.l3s.uni-hannover.de), dérivé de Wikiquote',
      license: 'CC BY 4.0 (QuoteKG) — contenu dérivé de Wikiquote (CC BY-SA)',
      lang: args.lang,
      quoteCount: data.quotes.length,
      rejectedCount: rejected,
    };
    save(args.output, data);
    console.log(
      `  offset ${offset} — ${data.quotes.length} citation(s) retenue(s), ${rejected} rejetée(s)`,
    );
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\nTerminé : ${data.quotes.length} citations retenues (${rejected} rejetées : trop`);
  console.log('courtes, source hors fr/en.wikiquote.org, ou doublons).');
  console.log(`Fichier: ${args.output}`);
  console.log(
    "Pensez à relire un échantillon et à trancher theme/notoriety/publicDomain avant de l'intégrer au corpus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
