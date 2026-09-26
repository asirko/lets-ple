import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseGeography } from '../src/lib/data/geography';
import { silhouette } from '../src/lib/domain/silhouette';
import { createCatalog } from '../src/lib/domain/catalog';
import { normalizeSearch } from '../src/lib/domain/normalize';

const raw: unknown = JSON.parse(readFileSync('content/geography/countries.json', 'utf8'));
it('charge le corpus servi, ses médias locaux et toutes les silhouettes sans coordonnées invalides', () => {
  const countries = parseGeography(raw);
  expect(countries).toHaveLength(195);
  for (const country of countries) {
    expect(existsSync(country.flag)).toBe(true);
    expect(readFileSync(country.flag, 'utf8')).not.toMatch(
      /<title|<desc|<script|<image|https?:\/\/(?!www\.w3\.org)/,
    );
    if (country.geometry) expect(silhouette(country.geometry).path).not.toMatch(/NaN|Infinity/);
  }
});
it('refuse un corpus tronqué, dupliqué ou contenant une géométrie corrompue', () => {
  const countries = parseGeography(raw);
  expect(() => parseGeography([])).toThrow();
  expect(() => parseGeography([...countries, countries[0]])).toThrow();
  expect(() =>
    parseGeography(
      countries.map((c, i) => (i ? c : { ...c, geometry: { type: 'Polygon', coordinates: [] } })),
    ),
  ).toThrow();
});
it('ne permet pas à un alias de désigner deux réponses différentes', () => {
  const catalog = createCatalog(parseGeography(raw));
  for (const domain of [catalog.country, catalog.capital]) {
    const names = new Map<string, string>();
    for (const answer of domain)
      for (const label of [answer.label, ...answer.aliases]) {
        const normalized = normalizeSearch(label);
        expect(names.get(normalized) ?? answer.id).toBe(answer.id);
        names.set(normalized, answer.id);
      }
  }
});
