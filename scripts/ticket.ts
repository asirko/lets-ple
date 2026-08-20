/**
 * Ouvre un sujet de travail isolé : worktree git dédié, dépendances jointes depuis la racine,
 * port de dev réservé, et — pour une issue GitHub — son contexte imprimé d'un seul bloc.
 *
 * ```
 * npm run ticket 42              # issue GitHub : branche 42-<titre>, contexte imprimé
 * npm run ticket refacto-css     # sujet libre : branche refacto-css
 * npm run ticket:deps            # détache la jonction node_modules du worktree courant
 * npm run ticket:clean 42-...    # retire jonction puis worktree
 * ```
 *
 * Le `node_modules` d'un worktree est une **jonction** vers celui de la racine : instantané et
 * sans coût disque, mais partagé — un `npm install` lancé dans un worktree écrirait dans la
 * racine. Passer par `npm run ticket:deps` avant de toucher aux dépendances d'une branche.
 */
import { execFileSync, execSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import {
  branchNameFor,
  formatIssueContext,
  parsePortFile,
  pickPort,
  type GhIssue,
} from './ticket-lib';

const WORKTREES_DIR = join('.claude', 'worktrees');
const PORT_FILE = '.worktree-port';
const BASE_BRANCH = 'main';

/** Exécute un binaire et rend sa sortie standard. Sans `shell` : Node déprécie args + shell. */
function run(command: string, args: string[], cwd = process.cwd()): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();
}

/**
 * Exécute npm en laissant sa sortie à l'écran. `execSync` passe toujours par un shell, ce qu'il
 * faut ici : sous Windows, npm est un `.cmd` que `execFileSync` ne sait pas lancer directement.
 */
function npm(ligne: string, cwd: string): void {
  execSync(`npm ${ligne}`, { cwd, stdio: 'inherit' });
}

function git(args: string[], cwd = process.cwd()): string {
  return run('git', args, cwd);
}

/** Chemins de tous les worktrees, le dépôt principal en tête. */
function worktreePaths(cwd = process.cwd()): string[] {
  return git(['worktree', 'list', '--porcelain'], cwd)
    .split('\n')
    .filter((ligne) => ligne.startsWith('worktree '))
    .map((ligne) => ligne.replace(/^worktree /, '').trim());
}

/**
 * Racine du dépôt principal, même quand le script est lancé depuis un worktree. Normalisée :
 * git rend des chemins en slashs là où `process.cwd()` rend des antislashs sous Windows.
 */
function mainRepoRoot(): string {
  return resolve(worktreePaths()[0]);
}

function branchExists(root: string, branch: string): boolean {
  try {
    git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], root);
    return true;
  } catch {
    return false;
  }
}

function fetchIssue(numero: number): GhIssue {
  const json = run('gh', [
    'issue',
    'view',
    String(numero),
    '--json',
    'number,title,body,labels,milestone',
  ]);
  return JSON.parse(json) as GhIssue;
}

/** Ports déjà réservés par les worktrees, lus dans leur `.worktree-port`. */
function reservedPorts(root: string): number[] {
  return worktreePaths(root)
    .map((chemin) => join(chemin, PORT_FILE))
    .map((fichier) => parsePortFile(existsSync(fichier) ? readFileSync(fichier, 'utf8') : null))
    .filter((port): port is number => port !== null);
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const serveur = createServer();
    serveur.once('error', () => resolve(false));
    serveur.once('listening', () => serveur.close(() => resolve(true)));
    serveur.listen(port, '127.0.0.1');
  });
}

/** Premier port de la plage ni réservé par un worktree, ni réellement occupé sur la machine. */
async function allocatePort(root: string): Promise<number> {
  const pris = reservedPorts(root);

  for (;;) {
    const candidat = pickPort(pris);
    if (await isPortFree(candidat)) return candidat;
    pris.push(candidat);
  }
}

/** Port déjà réservé par ce worktree, `null` s'il n'en a pas encore. */
function readPort(worktree: string): number | null {
  const fichier = join(worktree, PORT_FILE);
  return parsePortFile(existsSync(fichier) ? readFileSync(fichier, 'utf8') : null);
}

/** Réserve un port pour ce worktree et l'y inscrit. */
async function assignPort(root: string, worktree: string): Promise<number> {
  const port = await allocatePort(root);
  writeFileSync(join(worktree, PORT_FILE), `${port}\n`, 'utf8');
  return port;
}

function isJunction(chemin: string): boolean {
  return existsSync(chemin) && lstatSync(chemin).isSymbolicLink();
}

/**
 * Retire le lien seul, jamais son contenu : `unlinkSync` sur une jonction ne suit pas le lien,
 * le `node_modules` de la racine reste donc intact.
 */
function removeJunction(chemin: string): void {
  unlinkSync(chemin);
}

/**
 * Relie le `node_modules` du worktree à celui de la racine. Bascule sur un `npm ci` réel si la
 * branche n'a pas le même `package-lock.json` que la racine — ses dépendances y diffèrent.
 */
function linkDependencies(root: string, worktree: string): string {
  const lockRacine = readFileSync(join(root, 'package-lock.json'), 'utf8');
  const lockBranche = readFileSync(join(worktree, 'package-lock.json'), 'utf8');

  if (lockRacine !== lockBranche) {
    npm('ci', worktree);
    return 'npm ci (package-lock different de la racine)';
  }

  symlinkSync(join(root, 'node_modules'), join(worktree, 'node_modules'), 'junction');
  return 'jonction vers la racine';
}

function report(infos: {
  branche: string;
  worktree: string;
  port: number | null;
  deps: string;
  issue: GhIssue | null;
  reprise: boolean;
}): void {
  const lignes = [
    infos.reprise ? '— sujet deja ouvert, reprise —' : '— sujet ouvert —',
    `branche  : ${infos.branche}`,
    `worktree : ${infos.worktree}`,
    `port     : ${infos.port ?? 'aucun'} (npm start le prend tout seul)`,
    `deps     : ${infos.deps}`,
  ];

  if (infos.issue) lignes.push('', formatIssueContext(infos.issue));

  console.log(lignes.join('\n'));
}

async function openTicket(argument: string): Promise<void> {
  const root = mainRepoRoot();
  const issue = /^\d+$/.test(argument) ? fetchIssue(Number(argument)) : null;
  const branche = issue
    ? branchNameFor({ issueNumber: issue.number, title: issue.title })
    : branchNameFor({ title: argument });
  const worktree = join(root, WORKTREES_DIR, branche);

  if (existsSync(worktree)) {
    // Un worktree créé à la main n'a pas de port : la reprise lui en attribue un au passage.
    const port = readPort(worktree) ?? (await assignPort(root, worktree));
    report({ branche, worktree, port, deps: 'deja en place', issue, reprise: true });
    return;
  }

  git(
    branchExists(root, branche)
      ? ['worktree', 'add', worktree, branche]
      : ['worktree', 'add', worktree, '-b', branche, BASE_BRANCH],
    root,
  );

  const deps = linkDependencies(root, worktree);
  const port = await assignPort(root, worktree);

  report({ branche, worktree, port, deps, issue, reprise: false });
}

/** Remplace la jonction du worktree courant par une vraie installation, isolée de la racine. */
function detachDeps(): void {
  const cwd = process.cwd();
  const modules = join(cwd, 'node_modules');

  if (cwd === mainRepoRoot()) {
    throw new Error('A lancer depuis un worktree, pas depuis la racine du depot.');
  }
  if (!isJunction(modules)) {
    console.log('node_modules n est pas une jonction : rien a detacher.');
    return;
  }

  removeJunction(modules);
  npm('install', cwd);
  console.log(`node_modules detache et installe dans ${cwd}`);
}

/** Retire la jonction puis le worktree. La branche, elle, survit. */
function cleanTicket(branche: string): void {
  const root = mainRepoRoot();
  const worktree = join(root, WORKTREES_DIR, branche);

  if (!existsSync(worktree)) throw new Error(`Worktree introuvable : ${worktree}`);
  // Windows refuse de supprimer un répertoire qui sert de dossier courant à un processus.
  if (process.cwd().startsWith(worktree)) {
    throw new Error(`A lancer depuis ${root}, pas depuis le worktree a supprimer.`);
  }
  if (isJunction(join(worktree, 'node_modules'))) removeJunction(join(worktree, 'node_modules'));
  // Nos propres traces d'abord : git refuse de retirer un worktree portant des fichiers non suivis.
  if (existsSync(join(worktree, PORT_FILE))) unlinkSync(join(worktree, PORT_FILE));

  try {
    git(['worktree', 'remove', worktree], root);
  } catch {
    throw new Error(
      `Worktree non retire : ${worktree} porte du travail non commite.\n` +
        'Termine ou abandonne ces modifications, puis relance.',
    );
  }

  console.log(`worktree retire : ${worktree}\nla branche ${branche} est conservee.`);
}

async function main(): Promise<void> {
  const [commande, ...reste] = process.argv.slice(2);

  if (commande === '--detach-deps') {
    detachDeps();
  } else if (commande === '--clean') {
    if (!reste[0]) throw new Error('Usage : npm run ticket:clean <nom-de-branche>');
    cleanTicket(reste[0]);
  } else if (!commande) {
    throw new Error('Usage : npm run ticket <numero-d-issue | nom-de-sujet>');
  } else {
    await openTicket(commande);
  }
}

main().catch((erreur: unknown) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exitCode = 1;
});
