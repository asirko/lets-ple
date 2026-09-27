import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareRelease } from './prepare';
import * as repository from './repository';
import { renderChangelog } from './notes';
import { validateCommits } from './check-commits';
import { checkRelease } from './check-release';

const repos: string[] = [];
const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};
const git = (cwd: string, args: string[]) =>
  execFileSync('git', args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
function fixture(message = 'fix(portal): corrige le chargement'): string {
  const cwd = mkdtempSync(join(tmpdir(), 'letsple-release-'));
  repos.push(cwd);
  git(cwd, ['init', '-b', 'develop']);
  git(cwd, ['config', 'user.name', 'Release Test']);
  git(cwd, ['config', 'user.email', 'release@example.invalid']);
  git(cwd, ['config', 'commit.gpgsign', 'false']);
  git(cwd, ['config', 'tag.gpgSign', 'false']);
  mkdirSync(join(cwd, 'projects/apps/portal/src/app/releases'), { recursive: true });
  const pkg = { name: 'release-fixture', version: '0.1.0', private: true };
  writeFileSync(join(cwd, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  writeFileSync(
    join(cwd, 'package-lock.json'),
    JSON.stringify({ ...pkg, lockfileVersion: 3, packages: { '': pkg } }, null, 2) + '\n',
  );
  const notes = [
    {
      version: '0.1.0',
      date: '2026-08-01',
      features: ['premiere version'],
      fixes: [],
      breaking: [],
    },
  ];
  writeFileSync(join(cwd, repository.NOTES_PATH), JSON.stringify(notes, null, 2) + '\n');
  writeFileSync(join(cwd, 'CHANGELOG.md'), renderChangelog(notes));
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-m', 'feat(portal): premiere version']);
  git(cwd, ['tag', 'v0.1.0']);
  writeFileSync(join(cwd, 'feature.txt'), 'change\n');
  git(cwd, ['add', 'feature.txt']);
  git(cwd, ['commit', '-m', message]);
  return cwd;
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const cwd of repos.splice(0)) rmSync(cwd, { recursive: true, force: true });
});

describe('preparation de release dans un vrai depot', () => {
  it('valide seulement la plage demandee et signale les nouveaux messages invalides', () => {
    const cwd = fixture();
    expect(validateCommits(cwd, 'v0.1.0', 'HEAD')).toBe(1);
    git(cwd, ['commit', '--allow-empty', '-m', 'message invalide']);
    const invalid = git(cwd, ['rev-parse', 'HEAD']);
    expect(() => validateCommits(cwd, 'v0.1.0', 'HEAD')).toThrow(invalid);
    git(cwd, ['commit', '--allow-empty', '-m', 'docs: precise les regles']);
    expect(validateCommits(cwd, invalid, 'HEAD')).toBe(1);
  });
  it('verifie la coherence des notes, du changelog et de la version avant build', () => {
    const cwd = fixture();
    expect(repository.readReleaseState(cwd).version).toBe('0.1.0');
    writeFileSync(join(cwd, 'CHANGELOG.md'), '# Changelog different');
    expect(() => repository.readReleaseState(cwd)).toThrow(/CHANGELOG/);
  });
  it.each([
    ['fix(portal): corrige le chargement', '0.1.1'],
    ['feat(portal): ajoute les nouveautes', '0.2.0'],
    ['feat(portal)!: change le stockage', '1.0.0'],
  ])(
    'publie localement %s => %s',
    (message, expected) => {
      const cwd = fixture(message);
      writeFileSync(join(cwd, 'personal.txt'), 'preserver');
      expect(prepareRelease(cwd, false)?.version).toBe(expected);
      expect(JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).version).toBe(expected);
      const lock = JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8'));
      expect(lock.version).toBe(expected);
      expect(lock.packages[''].version).toBe(expected);
      expect(git(cwd, ['log', '-1', '--format=%s'])).toBe(`chore(release): ${expected}`);
      expect(git(cwd, ['tag', '--points-at', 'HEAD'])).toBe(`v${expected}`);
      expect(readFileSync(join(cwd, 'CHANGELOG.md'), 'utf8')).toContain('premiere version');
      expect(git(cwd, ['status', '--porcelain'])).toBe('?? personal.txt');
      expect(checkRelease(cwd, true)).toBe(expected);
      expect(prepareRelease(cwd, false)).toBeNull();
    },
    20000,
  );

  it('dry-run ne modifie ni fichiers, ni index, ni HEAD', () => {
    const cwd = fixture();
    const head = git(cwd, ['rev-parse', 'HEAD']);
    expect(() => checkRelease(cwd, true)).toThrow(/non versionnes/);
    expect(prepareRelease(cwd, true)?.version).toBe('0.1.1');
    expect(git(cwd, ['rev-parse', 'HEAD'])).toBe(head);
    expect(git(cwd, ['status', '--porcelain'])).toBe('');
  });

  it('ne versionne pas les seuls changements techniques', () => {
    expect(prepareRelease(fixture('docs: precise les regles'), false)).toBeNull();
  });

  it.each(['dirty', 'missing-tag', 'lock', 'untracked-output', 'non-ancestor', 'existing-target'])(
    "refuse l'etat %s avant toute ecriture",
    (state) => {
      const cwd = fixture();
      if (state === 'dirty') writeFileSync(join(cwd, 'feature.txt'), 'sale');
      if (state === 'missing-tag') git(cwd, ['tag', '-d', 'v0.1.0']);
      if (state === 'lock') {
        const path = join(cwd, 'package-lock.json');
        writeFileSync(path, readFileSync(path, 'utf8').replaceAll('0.1.0', '0.9.0'));
        git(cwd, ['add', path]);
        git(cwd, ['commit', '-m', 'chore: change le lock']);
      }
      if (state === 'untracked-output') git(cwd, ['rm', '--cached', 'CHANGELOG.md']);
      if (state === 'non-ancestor') {
        git(cwd, ['tag', '-d', 'v0.1.0']);
        const tree = git(cwd, ['rev-parse', 'HEAD^{tree}']);
        const unrelated = git(cwd, ['commit-tree', tree, '-m', 'unrelated']);
        git(cwd, ['tag', 'v0.1.0', unrelated]);
      }
      if (state === 'existing-target') git(cwd, ['tag', 'v0.1.1']);
      const before = readFileSync(join(cwd, 'package.json'), 'utf8');
      expect(() => prepareRelease(cwd, false)).toThrow();
      expect(readFileSync(join(cwd, 'package.json'), 'utf8')).toBe(before);
    },
  );

  it('restaure les fichiers et index si npm echoue apres ecriture', () => {
    const cwd = fixture();
    const before = repository.RELEASE_FILES.map((path) => readFileSync(join(cwd, path), 'utf8'));
    vi.spyOn(repository, 'bumpPackage').mockImplementation(() => {
      throw new Error('npm failed');
    });
    expect(() => prepareRelease(cwd, false)).toThrow(/npm failed/);
    expect(repository.RELEASE_FILES.map((path) => readFileSync(join(cwd, path), 'utf8'))).toEqual(
      before,
    );
    expect(git(cwd, ['status', '--porcelain'])).toBe('');
  });

  it('restaure les fichiers quand un hook refuse le commit', () => {
    const cwd = fixture();
    writeFileSync(join(cwd, '.git/hooks/pre-commit'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    const head = git(cwd, ['rev-parse', 'HEAD']);
    expect(() => prepareRelease(cwd, false)).toThrow();
    expect(git(cwd, ['rev-parse', 'HEAD'])).toBe(head);
    expect(git(cwd, ['status', '--porcelain'])).toBe('');
  }, 20000);
});
