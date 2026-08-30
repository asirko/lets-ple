import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildDictionary } from './build-dictionary';
import { validateDictionary } from './validate-dictionary';
import type { SerializedPrefixIndex } from './types';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

async function validDictionary(): Promise<string> {
  const output = await mkdtemp(join(tmpdir(), 'dernier-mot-validation-'));
  await buildDictionary({
    lexiquePath: fixture('lexique.tsv'),
    wiktionaryPath: fixture('wiktionary.jsonl'),
    sourcesManifestPath: fixture('sources.json'),
    outputDirectory: output,
  });
  return output;
}

describe('validateDictionary', () => {
  it('accepte un corpus cohérent et rapporte ses tailles', async () => {
    const report = await validateDictionary(await validDictionary());

    expect(report.entryCount).toBe(13);
    expect(report.files.map((file) => file.name)).toContain('definitions/Z.json');
    expect(report.files.every((file) => file.bytes > 0)).toBe(true);
  });

  it('rejette un compteur de descendants falsifié', async () => {
    const output = await validDictionary();
    const path = join(output, 'index.json');
    const index = JSON.parse(await readFile(path, 'utf8')) as SerializedPrefixIndex;
    await writeFile(
      path,
      `${JSON.stringify({ ...index, C: { ...index['C'], continuationCount: 99 } }, null, 2)}\n`,
    );

    await expect(validateDictionary(output)).rejects.toThrow(/continuationCount.*C/);
  });

  it('rejette une référence de définition absente', async () => {
    const output = await validDictionary();
    const path = join(output, 'index.json');
    const index = JSON.parse(await readFile(path, 'utf8')) as SerializedPrefixIndex;
    await writeFile(
      path,
      `${JSON.stringify({ ...index, CHAT: { ...index['CHAT'], definitionId: 'CHIEN' } }, null, 2)}\n`,
    );

    await expect(validateDictionary(output)).rejects.toThrow(/definitionId.*CHIEN/);
  });

  it('rejette un préfixe intermédiaire manquant', async () => {
    const output = await validDictionary();
    const path = join(output, 'index.json');
    const index = JSON.parse(await readFile(path, 'utf8')) as SerializedPrefixIndex;
    const withoutPrefix = Object.fromEntries(
      Object.entries(index).filter(([prefix]) => prefix !== 'CH'),
    );
    await writeFile(path, `${JSON.stringify(withoutPrefix, null, 2)}\n`);

    await expect(validateDictionary(output)).rejects.toThrow(/préfixe manquant.*CH/);
  });

  it('rejette une graphie non alphabétique', async () => {
    const output = await validDictionary();
    const path = join(output, 'definitions', 'C.json');
    const definitions = JSON.parse(await readFile(path, 'utf8')) as unknown[];
    const invalid = definitions.map((entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      'normalized' in entry &&
      entry.normalized === 'CHAT'
        ? { ...entry, forms: [{ spelling: 'chat-bot', glosses: ['Robot conversationnel.'] }] }
        : entry,
    );
    await writeFile(path, `${JSON.stringify(invalid, null, 2)}\n`);

    await expect(validateDictionary(output)).rejects.toThrow(/graphie inadmissible.*chat-bot/);
  });

  it('rejette un fichier inattendu dans les chunks de définition', async () => {
    const output = await validDictionary();
    await writeFile(join(output, 'definitions', 'STALE.json'), '[]\n');

    await expect(validateDictionary(output)).rejects.toThrow(/fichier inattendu.*STALE\.json/i);
  });

  it.each([
    ['url', 'https://', /URL de source invalide/],
    ['retrievedAt', '2026-02-30T00:00:00.000Z', /retrievedAt invalide/],
  ])('rejette une métadonnée source %s malformée', async (field, value, message) => {
    const output = await validDictionary();
    const manifestPath = join(output, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      sources: Array<Record<string, unknown>>;
    };
    manifest.sources[0] = { ...manifest.sources[0], [field]: value };
    await writeFile(manifestPath, JSON.stringify(manifest));

    await expect(validateDictionary(output)).rejects.toThrow(message);
  });

  it('rejette un manifeste qui ne permet pas de vérifier la licence des sources', async () => {
    const output = await validDictionary();
    const manifestPath = join(output, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      sources: Array<Record<string, unknown>>;
    };
    manifest.sources[0] = { ...manifest.sources[0], licenseUrl: undefined };
    await writeFile(manifestPath, JSON.stringify(manifest));

    await expect(validateDictionary(output)).rejects.toThrow(/attribution/i);
  });

  it('rejette un manifeste qui ne décrit pas les transformations', async () => {
    const output = await validDictionary();
    const manifestPath = join(output, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      adaptation?: Record<string, unknown>;
    };
    manifest.adaptation = { ...manifest.adaptation, notice: '' };
    await writeFile(manifestPath, JSON.stringify(manifest));

    await expect(validateDictionary(output)).rejects.toThrow(/adaptation/i);
  });
});
