import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CI Dernier Mot', () => {
  it('valide le corpus versionné avant de construire ou déployer le portail', async () => {
    const workflow = await readFile(resolve('.github/workflows/ci.yml'), 'utf8');
    const validation = workflow.indexOf('npm run validate:dernier-mot-dictionary');
    const build = workflow.indexOf('npm run build');
    const deployment = workflow.indexOf('FirebaseExtended/action-hosting-deploy');

    expect(validation).toBeGreaterThan(-1);
    expect(validation).toBeLessThan(build);
    expect(validation).toBeLessThan(deployment);
  });
});
