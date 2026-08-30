import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOMAIN = import.meta.dirname;
const INTERDITS = /from ['"](@angular\/|rxjs)/;

function fichiersTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const chemin = join(dir, entry.name);
    if (entry.isDirectory()) return fichiersTs(chemin);
    return entry.name.endsWith('.ts') ? [chemin] : [];
  });
}

describe('pureté du domaine Dernier Mot', () => {
  it("n'importe aucun paquet Angular ni RxJS", () => {
    const fautifs = fichiersTs(DOMAIN).filter((f) => INTERDITS.test(readFileSync(f, 'utf8')));
    expect(fautifs).toEqual([]);
  });

  it('couvre bien les fichiers du domaine', () => {
    expect(fichiersTs(DOMAIN).length).toBeGreaterThanOrEqual(5);
  });
});
