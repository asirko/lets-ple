import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chooseBump, nextVersion, parseCommit } from './commits';
import { makeNotes, renderChangelog, type ReleaseNotes } from './notes';
import {
  bumpPackage,
  git,
  isMain,
  NOTES_PATH,
  readCommits,
  readReleaseState,
  RELEASE_FILES,
} from './repository';

export function prepareRelease(cwd: string, dryRun: boolean): ReleaseNotes | null {
  git(cwd, ['symbolic-ref', '--quiet', 'HEAD']);
  if (git(cwd, ['rev-parse', '--is-shallow-repository']) !== 'false')
    throw new Error('Historique incomplet : recuperer les commits et tags.');
  if (git(cwd, ['status', '--porcelain', '--untracked-files=no']))
    throw new Error(
      'Le depot contient des modifications suivies : les committer avant la release.',
    );
  for (const path of RELEASE_FILES) git(cwd, ['ls-files', '--error-unmatch', '--', path]);
  const { version, releases } = readReleaseState(cwd);
  const tag = `v${version}`;
  try {
    git(cwd, ['merge-base', '--is-ancestor', tag, 'HEAD']);
  } catch {
    throw new Error(
      `Tag ${tag} absent ou hors de l'ascendance de HEAD. Recuperer les tags ou terminer la release precedente.`,
    );
  }
  const commits = readCommits(cwd, tag).map(parseCommit);
  const bump = chooseBump(commits);
  if (!bump) return null;
  const next = nextVersion(version, bump);
  if (git(cwd, ['tag', '--list', `v${next}`])) throw new Error(`Le tag v${next} existe deja.`);
  const notes = makeNotes(next, new Date().toISOString().slice(0, 10), commits);
  if (dryRun) return notes;

  const originalHead = git(cwd, ['rev-parse', 'HEAD']);
  const original = RELEASE_FILES.map((path) => readFileSync(join(cwd, path)));
  try {
    writeFileSync(join(cwd, NOTES_PATH), JSON.stringify([notes, ...releases], null, 2) + '\n');
    writeFileSync(join(cwd, 'CHANGELOG.md'), renderChangelog([notes, ...releases]));
    bumpPackage(cwd, bump);
    readReleaseState(cwd);
    git(cwd, ['add', '--', ...RELEASE_FILES]);
    git(cwd, ['commit', '-m', `chore(release): ${next}`]);
    git(cwd, ['tag', `v${next}`]);
  } catch (error) {
    if (git(cwd, ['rev-parse', 'HEAD']) !== originalHead) {
      throw new Error(
        `Commit de release conserve. Verifier HEAD puis creer le tag manquant avec git tag v${next}.`,
        { cause: error },
      );
    }
    RELEASE_FILES.forEach((path, i) => writeFileSync(join(cwd, path), original[i]));
    git(cwd, ['reset', '--quiet', 'HEAD', '--', ...RELEASE_FILES]);
    throw error;
  }
  return notes;
}

if (isMain(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== '--dry-run') || args.length > 1)
      throw new Error('Usage : npm run release:prepare -- [--dry-run]');
    const dryRun = args.includes('--dry-run');
    const { version } = readReleaseState(process.cwd());
    const notes = prepareRelease(process.cwd(), dryRun);
    console.log(
      notes
        ? `${dryRun ? 'Apercu' : 'Release locale'} : v${version}..HEAD -> v${notes.version}\n\n${renderChangelog([notes])}`
        : 'Aucun changement publiable depuis la derniere version.',
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
