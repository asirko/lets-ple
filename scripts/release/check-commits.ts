import { readFileSync } from 'node:fs';
import { parseCommit } from './commits';
import { git, isMain, readCommits } from './repository';

export function validateCommits(cwd: string, base: string, head: string): number {
  const commits = readCommits(cwd, base, head);
  for (const commit of commits) parseCommit(commit);
  return commits.length;
}

if (isMain(import.meta.url)) {
  try {
    let [base, head, ...extra] = process.argv.slice(2);
    if (extra.length || !!base !== !!head)
      throw new Error('Usage : npm run check:commits -- <base> <head>');
    if (!base) {
      const eventPath = process.env['GITHUB_EVENT_PATH'];
      const event = eventPath ? JSON.parse(readFileSync(eventPath, 'utf8')) : {};
      head = event.pull_request?.head?.sha ?? event.after ?? 'HEAD';
      base = event.pull_request?.base?.sha ?? event.before;
      if (!base || /^0+$/.test(base))
        base = git(process.cwd(), ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', head]);
    }
    console.log(
      `${validateCommits(process.cwd(), base, head)} commits conformes (${base}..${head}).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
