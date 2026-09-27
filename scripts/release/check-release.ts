import { chooseBump, parseCommit } from './commits';
import { git, isMain, readCommits, readReleaseState } from './repository';

export function checkRelease(cwd: string, released = false): string {
  const { version } = readReleaseState(cwd);
  if (released) {
    git(cwd, ['merge-base', '--is-ancestor', `v${version}`, 'HEAD']);
    if (chooseBump(readCommits(cwd, `v${version}`).map(parseCommit))) {
      throw new Error(
        'Changements publiables non versionnes : lancer npm run release:prepare avant integration dans main.',
      );
    }
  }
  return version;
}
if (isMain(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.some((arg) => arg !== '--released'))
      throw new Error('Usage : npm run check:release -- [--released]');
    console.log(
      `Version ${checkRelease(process.cwd(), args.includes('--released'))} : package, lockfile, changelog et notes coherents.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
