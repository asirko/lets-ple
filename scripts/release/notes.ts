import type { ParsedCommit } from './commits';

export interface ReleaseNotes {
  version: string;
  date: string;
  features: string[];
  fixes: string[];
  breaking: string[];
}

export function makeNotes(
  version: string,
  date: string,
  commits: readonly ParsedCommit[],
): ReleaseNotes {
  return {
    version,
    date,
    features: commits.filter((c) => c.type === 'feat').map((c) => c.subject),
    fixes: commits.filter((c) => c.type === 'fix').map((c) => c.subject),
    breaking: commits
      .filter((c) => c.breaking)
      .flatMap((c) => (c.breakingNotes.length ? c.breakingNotes : [c.subject])),
  };
}

export function renderChangelog(releases: readonly ReleaseNotes[]): string {
  return (
    '# Changelog\n\n' +
    releases
      .map((release) => {
        const sections = (
          [
            ['Changements incompatibles', release.breaking],
            ['Nouveautés', release.features],
            ['Corrections', release.fixes],
          ] as const
        )
          .filter(([, entries]) => entries.length)
          .map(
            ([title, entries]) =>
              `### ${title}\n\n${entries.map((text) => '- ' + text.replace(/\n/g, '\n  ')).join('\n')}\n`,
          );
        return `## ${release.version} — ${release.date}\n\n${sections.join('\n')}`;
      })
      .join('\n')
  );
}
