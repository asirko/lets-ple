export type Bump = 'major' | 'minor' | 'patch';
export interface GitCommit {
  hash: string;
  message: string;
}
export interface ParsedCommit extends GitCommit {
  type: string;
  scope?: string;
  subject: string;
  breaking: boolean;
  breakingNotes: string[];
}

export function parseCommit(commit: GitCommit): ParsedCommit {
  const [header, ...body] = commit.message.trim().split(/\r?\n/);
  const match =
    /^(feat|fix|test|docs|refactor|chore|build|ci|perf|style|revert)(?:\(([a-z0-9][a-z0-9/-]*)\))?(!)?: (\S.*)$/.exec(
      header,
    );
  const invalid = () => new Error(`Commit ${commit.hash} non conforme : ${header}`);
  if (!match) throw invalid();
  const [, type, scope, bang, subject] = match;
  if (
    (['feat', 'fix', 'test', 'refactor', 'perf'].includes(type) && !scope) ||
    /[\u0300-\u036f]/.test(subject.normalize('NFD')) ||
    /[éèêëàâäîïôöùûüçœæ]/i.test(subject) ||
    /[.\s]$/.test(subject) ||
    /^[A-Z]/.test(subject)
  )
    throw invalid();
  const breakingNotes: string[] = [];
  for (let i = 0; i < body.length; i++) {
    const footer = /^BREAKING(?: CHANGE|-CHANGE):\s*(.*)$/.exec(body[i]);
    if (!footer) continue;
    const lines = [footer[1]];
    while (i + 1 < body.length && !/^(?:[\w-]+|BREAKING CHANGE)(?::\s| #)/.test(body[i + 1])) {
      lines.push(body[++i]);
    }
    if (!lines.join('').trim()) throw invalid();
    breakingNotes.push(lines.join('\n').trim());
  }
  return {
    ...commit,
    type,
    scope,
    subject,
    breaking: !!bang || breakingNotes.length > 0,
    breakingNotes,
  };
}

export function chooseBump(commits: readonly ParsedCommit[]): Bump | null {
  if (commits.some((c) => c.breaking)) return 'major';
  if (commits.some((c) => c.type === 'feat')) return 'minor';
  if (commits.some((c) => c.type === 'fix')) return 'patch';
  return null;
}

export function versionParts(version: string): number[] {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new Error(`Version stable invalide : ${version}`);
  const parts = version.split('.').map(Number);
  if (parts.some((n) => !Number.isSafeInteger(n)))
    throw new Error(`Version trop grande : ${version}`);
  return parts;
}

export function nextVersion(current: string, bump: Bump): string {
  const parts = versionParts(current);
  const index = { major: 0, minor: 1, patch: 2 }[bump];
  parts[index]++;
  for (let i = index + 1; i < 3; i++) parts[i] = 0;
  const next = parts.join('.');
  versionParts(next);
  return next;
}
