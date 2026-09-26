import { normalizeSearch } from './normalize';
import type { Answer, Country } from './types';

export interface Catalog {
  readonly countries: readonly Country[];
  readonly country: readonly Answer[];
  readonly capital: readonly Answer[];
}

export function createCatalog(countries: readonly Country[]): Catalog {
  const capitals = new Map<string, Answer>();
  for (const country of countries)
    for (const label of country.capitals) {
      const id = normalizeSearch(label);
      const previous = capitals.get(id);
      capitals.set(id, {
        id,
        label,
        aliases: [
          ...new Set([...(previous?.aliases ?? []), ...(country.capitalAliases[label] ?? [])]),
        ],
        countryCodes: [...(previous?.countryCodes ?? []), country.iso3],
      });
    }
  return {
    countries,
    country: countries.map((c) => ({
      id: c.iso3,
      label: c.name,
      aliases: c.aliases,
      countryCodes: [c.iso3],
    })),
    capital: [...capitals.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr')),
  };
}

export function matchesAnswer(answer: Answer, value: string): boolean {
  const normalized = normalizeSearch(value);
  return (
    normalized.length > 0 &&
    [answer.label, ...answer.aliases].some((label) => normalizeSearch(label) === normalized)
  );
}

/** Entire domain is searched. The UI scrolls the filtered results, without truncation. */
export function searchAnswers(domain: readonly Answer[], value: string): readonly Answer[] {
  const normalized = normalizeSearch(value);
  if (!normalized) return [];
  return domain.filter((answer) =>
    [answer.label, ...answer.aliases].some((label) => normalizeSearch(label).includes(normalized)),
  );
}
