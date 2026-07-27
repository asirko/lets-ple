import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Verrou d'architecture.
 *
 * La règle la plus importante du projet — le moteur ne dépend pas du framework — est aussi la
 * plus facile à enfreindre par distraction, en laissant un éditeur ajouter un import
 * automatique. Ce test la rend impossible à violer sans que la CI le signale.
 */

const DOMAIN = import.meta.dirname;
const INTERDITS = /from ['"](@angular\/|rxjs)/;

function fichiersTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const chemin = join(dir, entry.name);
    if (entry.isDirectory()) return fichiersTs(chemin);
    return entry.name.endsWith('.ts') ? [chemin] : [];
  });
}

describe('pureté du moteur', () => {
  it("n'importe aucun paquet Angular ni RxJS", () => {
    const fautifs = fichiersTs(DOMAIN).filter((f) => INTERDITS.test(readFileSync(f, 'utf8')));
    expect(fautifs).toEqual([]);
  });

  it('couvre bien les fichiers du domaine', () => {
    // Garde-fou du garde-fou : si le scan ne trouve rien, le test précédent passerait à vide.
    expect(fichiersTs(DOMAIN).length).toBeGreaterThan(5);
  });
});
