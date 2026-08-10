/**
 * Convertit le pool filtré de `content/quote-candidates/quotekg.json` (quality >= 0.7, encore sans
 * `theme`/`notoriety`/`publicDomain`) en citations conformes au schéma et les ajoute aux fichiers
 * de `content/quotes/`.
 *
 * `theme`, `notoriety` et `publicDomain` n'existent dans aucune source automatisée : ce script
 * applique une table `AUTHOR_OVERRIDES` couvrant les auteurs identifiés avec confiance (statut de
 * domaine public vérifié à la main, règle des 70 ans après la mort de l'auteur en France — en
 * tenant compte des prorogations de guerre pour les "morts pour la France" des deux guerres
 * mondiales, ex. Saint-Exupéry, Péguy, qui restent protégés au-delà de la règle générale). Tout
 * auteur absent de la table reçoit `DEFAULT_META` : `theme: 'litterature'`, `notoriety: 3`,
 * `publicDomain: false` — un défaut délibérément **prudent** (jamais une fausse affirmation de
 * domaine public) plutôt qu'une couverture exhaustive des 1500+ auteurs du pool. C'est un premier
 * jet ; la sortie du script (compte `publicDomain: true` vs `false`) indique l'ampleur de la revue
 * manuelle restant à faire pour élargir la table.
 *
 * Usage : npm run import:quotes -- [--input fichier.json] [--dir content/quotes]
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Quote, Theme } from './quote-schema';

export interface QuoteKgCandidate {
  author: string;
  text: string;
  context: string | null;
  sourceUrl: string;
  quality: number;
}

interface AuthorMeta {
  theme: Theme;
  notoriety: 1 | 2 | 3 | 4 | 5;
  publicDomain: boolean;
}

const DEFAULT_META: AuthorMeta = { theme: 'litterature', notoriety: 3, publicDomain: false };

/** Auteurs classés à la main — voir en-tête pour la méthode. Clés = `author` exact de QuoteKG. */
const AUTHOR_OVERRIDES: Record<string, AuthorMeta> = {
  // Domaine public (mort il y a plus de 70 ans, sans prorogation de guerre connue)
  'Honoré de Balzac': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'François de La Rochefoucauld': { theme: 'litterature', notoriety: 4, publicDomain: true },
  Voltaire: { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Joseph Joubert': { theme: 'litterature', notoriety: 3, publicDomain: true },
  'G. K. Chesterton': { theme: 'litterature', notoriety: 4, publicDomain: true },
  'Nicolas Chamfort': { theme: 'litterature', notoriety: 3, publicDomain: true },
  'Franz Werfel': { theme: 'litterature', notoriety: 3, publicDomain: true },
  'François Rabelais': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Pierre Corneille': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Charles Baudelaire': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Octave Mirbeau': { theme: 'litterature', notoriety: 3, publicDomain: true },
  'Xavier Forneret': { theme: 'litterature', notoriety: 2, publicDomain: true },
  'Jean de La Bruyère': { theme: 'litterature', notoriety: 4, publicDomain: true },
  'Maximilien Robespierre': { theme: 'historique', notoriety: 5, publicDomain: true },
  Stendhal: { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Lev Vygotsky': { theme: 'scientifique', notoriety: 4, publicDomain: true },
  'Augustine of Hippo': { theme: 'historique', notoriety: 5, publicDomain: true },
  'Jules Verne': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Anatole France': { theme: 'litterature', notoriety: 4, publicDomain: true },
  'Niccolò Machiavelli': { theme: 'historique', notoriety: 5, publicDomain: true },
  'George Sand': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Karl Marx': { theme: 'historique', notoriety: 5, publicDomain: true },
  'Arthur Rimbaud': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Michel de Montaigne': { theme: 'litterature', notoriety: 5, publicDomain: true },
  'Jean de La Fontaine': { theme: 'litterature', notoriety: 5, publicDomain: true },
  Molière: { theme: 'litterature', notoriety: 5, publicDomain: true },

  // Encore protégés (vivants, morts il y a moins de 70 ans, ou prorogation de guerre)
  'Michel Henry': { theme: 'litterature', notoriety: 3, publicDomain: false },
  Coluche: { theme: 'pop-culture', notoriety: 4, publicDomain: false },
  'Henri Wallon (psychologist)': { theme: 'scientifique', notoriety: 3, publicDomain: false },
  'Zinedine Zidane': { theme: 'pop-culture', notoriety: 5, publicDomain: false },
  'Madonna (entertainer)': { theme: 'pop-culture', notoriety: 5, publicDomain: false },
  'Sylvain Tesson': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Imre Kertész': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Edgar Morin': { theme: 'scientifique', notoriety: 4, publicDomain: false },
  'André Breton': { theme: 'litterature', notoriety: 4, publicDomain: false },
  'Christian Bobin': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Cormac McCarthy': { theme: 'litterature', notoriety: 4, publicDomain: false },
  'Ernst Jünger': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Terry Pratchett': { theme: 'litterature', notoriety: 4, publicDomain: false },
  'Philip K. Dick': { theme: 'litterature', notoriety: 4, publicDomain: false },
  'Gaston Bachelard': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Amélie Nothomb': { theme: 'litterature', notoriety: 4, publicDomain: false },
  'Jacques Ellul': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Michel Onfray': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Jean Baudrillard': { theme: 'scientifique', notoriety: 3, publicDomain: false },
  'Jean-Christophe Rufin': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Steven Pinker': { theme: 'scientifique', notoriety: 4, publicDomain: false },
  'Charles Péguy': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Antoine de Saint Exupéry': { theme: 'litterature', notoriety: 4, publicDomain: false },
  'J. M. Coetzee': { theme: 'litterature', notoriety: 4, publicDomain: false },
  'Fred Vargas': { theme: 'litterature', notoriety: 3, publicDomain: false },
  'Laurent Obertone': { theme: 'litterature', notoriety: 2, publicDomain: false },
  'Amanda Sthers': { theme: 'litterature', notoriety: 2, publicDomain: false },
  "Jean d'Ormesson": { theme: 'litterature', notoriety: 4, publicDomain: false },
  'Alain de Benoist': { theme: 'litterature', notoriety: 2, publicDomain: false },
  'Pierre Legendre (historian)': { theme: 'historique', notoriety: 2, publicDomain: false },
  'Maurice G. Dantec': { theme: 'litterature', notoriety: 3, publicDomain: false },
};

export function classifyAuthor(author: string): AuthorMeta {
  return AUTHOR_OVERRIDES[author] ?? DEFAULT_META;
}

export function toQuoteId(index: number): string {
  return `quotekg-${String(index).padStart(6, '0')}`;
}

/** `index` est la position 1-based dans le lot importé — pas dans le fichier de destination. */
export function candidateToQuote(candidate: QuoteKgCandidate, index: number): Quote {
  const meta = classifyAuthor(candidate.author);
  return {
    id: toQuoteId(index),
    lang: 'fr',
    text: candidate.text.trim(),
    author: candidate.author,
    source: candidate.context?.trim() || 'Wikiquote',
    theme: meta.theme,
    notoriety: meta.notoriety,
    publicDomain: meta.publicDomain,
  };
}

export function groupByTheme(quotes: readonly Quote[]): Record<Theme, Quote[]> {
  const groups: Record<Theme, Quote[]> = {
    litterature: [],
    historique: [],
    scientifique: [],
    'pop-culture': [],
  };
  for (const quote of quotes) groups[quote.theme].push(quote);
  return groups;
}

interface CliArgs {
  input: string;
  dir: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { input: 'content/quote-candidates/quotekg.json', dir: 'content/quotes' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--dir') args.dir = argv[++i];
  }
  return args;
}

function isMainModule(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const args = parseArgs(process.argv.slice(2));
  const raw: { quotes: QuoteKgCandidate[] } = JSON.parse(readFileSync(args.input, 'utf-8'));

  const imported = raw.quotes.map((candidate, i) => candidateToQuote(candidate, i + 1));
  const grouped = groupByTheme(imported);

  for (const [theme, quotes] of Object.entries(grouped) as [Theme, Quote[]][]) {
    if (quotes.length === 0) continue;
    const path = join(args.dir, `${theme}.json`);
    const existing: Quote[] = readdirSync(args.dir).includes(`${theme}.json`)
      ? JSON.parse(readFileSync(path, 'utf-8'))
      : [];
    writeFileSync(path, JSON.stringify([...existing, ...quotes], null, 2) + '\n', 'utf-8');
    console.log(`${theme}.json: +${quotes.length} (total ${existing.length + quotes.length})`);
  }

  const publicDomainCount = imported.filter((q) => q.publicDomain).length;
  console.log(`\n${imported.length} citations importées.`);
  console.log(
    `publicDomain: true pour ${publicDomainCount}, false (par défaut ou vérifié) pour ` +
      `${imported.length - publicDomainCount} — la table AUTHOR_OVERRIDES ne couvre qu'un ` +
      `sous-ensemble des auteurs, le reste attend une revue manuelle avant publication.`,
  );
}
