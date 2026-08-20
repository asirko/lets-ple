/**
 * Fonctions pures du script `npm run ticket` (voir `scripts/ticket.ts`).
 *
 * Isolées ici pour être testables sans toucher au disque, à git ni au réseau : le script
 * lui-même ne garde que les effets de bord.
 */

/** Plage de ports réservée aux worktrees. 4200 reste celui du dépôt principal. */
export const PORT_RANGE = { start: 4201, end: 4299 } as const;

/** Longueur maximale de la partie « titre » d'un nom de branche. */
const SLUG_MAX_LENGTH = 40;

/**
 * Transforme un texte libre en identifiant de branche : sans accents, en minuscules, les mots
 * reliés par des tirets. Tronque à {@link SLUG_MAX_LENGTH} sans jamais couper un mot en deux.
 */
export function slugify(text: string): string {
  const brut = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (brut.length <= SLUG_MAX_LENGTH) return brut;

  const coupe = brut.slice(0, SLUG_MAX_LENGTH);
  const dernierTiret = coupe.lastIndexOf('-');
  return (dernierTiret > 0 ? coupe.slice(0, dernierTiret) : coupe).replace(/-+$/, '');
}

/**
 * Nom de branche d'un sujet : `42-titre-slugifie` pour une issue, le slug seul sinon.
 *
 * @throws si le titre ne donne aucun slug et qu'aucun numéro d'issue ne peut servir de repli.
 */
export function branchNameFor({
  issueNumber,
  title,
}: {
  issueNumber?: number;
  title: string;
}): string {
  const slug = slugify(title);

  if (issueNumber === undefined) {
    if (slug === '') throw new Error(`Sujet « ${title} » non slugifiable : donne un nom en clair.`);
    return slug;
  }

  return `${issueNumber}-${slug === '' ? 'ticket' : slug}`;
}

/**
 * Premier port libre de la plage. `taken` réunit les ports déjà réservés par un autre worktree
 * et ceux réellement occupés sur la machine.
 *
 * @throws si toute la plage est prise.
 */
export function pickPort(taken: readonly number[]): number {
  const pris = new Set(taken);

  for (let port = PORT_RANGE.start; port <= PORT_RANGE.end; port++) {
    if (!pris.has(port)) return port;
  }

  throw new Error(
    `Plage de ports épuisée (${PORT_RANGE.start}-${PORT_RANGE.end}) : nettoie des worktrees.`,
  );
}

/** Lit le contenu d'un `.worktree-port`. Rend `null` si absent, illisible ou hors plage. */
export function parsePortFile(content: string | null): number | null {
  if (content === null) return null;

  const trim = content.trim();
  if (!/^\d+$/.test(trim)) return null;

  const port = Number(trim);
  return port >= PORT_RANGE.start && port <= PORT_RANGE.end ? port : null;
}

/** Une issue GitHub telle que rendue par `gh issue view --json`. */
export interface GhIssue {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  milestone: { title: string } | null;
}

/**
 * Résume une issue en un bloc compact : c'est tout le contexte que l'agent lit au démarrage
 * d'un sujet, à la place d'un `gh issue view` séparé.
 */
export function formatIssueContext(issue: GhIssue): string {
  const lignes = [`== #${issue.number} ${issue.title} ==`];

  const labels = issue.labels.map((label) => label.name).filter((name) => name !== '');
  if (labels.length > 0) lignes.push(`Labels: ${labels.join(', ')}`);
  if (issue.milestone) lignes.push(`Jalon: ${issue.milestone.title}`);

  const corps = issue.body.trim();
  if (corps !== '') lignes.push('', corps);

  return lignes.join('\n');
}
