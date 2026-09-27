import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { versionParts, type Bump, type GitCommit } from './commits';
import { renderChangelog, type ReleaseNotes } from './notes';

export const NOTES_PATH = 'projects/apps/portal/src/app/releases/releases.json';
export const RELEASE_FILES = ['package.json', 'package-lock.json', 'CHANGELOG.md', NOTES_PATH];

export function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function readCommits(cwd: string, base: string, head = 'HEAD'): GitCommit[] {
  // Resolve user/CI inputs to hashes before forming a revision range.
  const from = git(cwd, ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]);
  const to = git(cwd, ['rev-parse', '--verify', '--end-of-options', `${head}^{commit}`]);
  const output = git(cwd, ['log', '--no-merges', '--format=%H%x00%B%x00', `${from}..${to}`]);
  if (!output) return [];
  const fields = output.split('\0');
  const commits: GitCommit[] = [];
  for (let i = 0; i + 1 < fields.length; i += 2)
    commits.push({ hash: fields[i].trim(), message: fields[i + 1].trim() });
  return commits;
}

export function readReleaseState(cwd: string): { version: string; releases: ReleaseNotes[] } {
  const read = (path: string) => JSON.parse(readFileSync(join(cwd, path), 'utf8'));
  const pkg = read('package.json');
  const lock = read('package-lock.json');
  versionParts(pkg.version);
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version)
    throw new Error('Versions package/lockfile incoherentes.');
  const releases: ReleaseNotes[] = read(NOTES_PATH);
  if (!Array.isArray(releases) || !releases.length || releases[0]?.version !== pkg.version)
    throw new Error('Version et notes incoherentes.');
  let previous: number[] | undefined;
  for (const release of releases) {
    const parts = versionParts(release.version);
    if (previous) {
      const index = parts.findIndex((n, i) => n !== previous![i]);
      if (index === -1 || parts[index] > previous[index])
        throw new Error('Notes non ordonnees ou version dupliquee.');
    }
    previous = parts;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date) || !Number.isFinite(Date.parse(release.date)))
      throw new Error('Date de release invalide.');
    for (const key of ['features', 'fixes', 'breaking'] as const) {
      if (
        !Array.isArray(release[key]) ||
        release[key].some((text) => typeof text !== 'string' || !text.trim())
      )
        throw new Error(`Notes ${key} invalides.`);
    }
  }
  if (
    readFileSync(join(cwd, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n') !==
    renderChangelog(releases)
  )
    throw new Error('CHANGELOG.md et notes incoherents.');
  return { version: pkg.version, releases };
}

export function bumpPackage(cwd: string, bump: Bump): void {
  const npmCli =
    process.env['npm_execpath'] ??
    [
      join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
      join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
    ].find(existsSync);
  if (!npmCli) throw new Error('Lancer avec npm run release:prepare pour localiser npm.');
  // No lifecycle scripts can mutate unrelated files during this transaction.
  execFileSync(
    process.execPath,
    [npmCli, 'version', bump, '--no-git-tag-version', '--ignore-scripts'],
    { cwd, stdio: 'pipe' },
  );
}

export function isMain(url: string): boolean {
  return !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(url);
}
