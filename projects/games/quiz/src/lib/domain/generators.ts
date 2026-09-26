import type { Catalog } from './catalog';
import { normalizeSearch } from './normalize';
import type { Country, Question, QuestionType } from './types';

export interface QuestionGenerator {
  readonly type: QuestionType;
  eligible(country: Country, catalog: Catalog): boolean;
  build(country: Country, catalog: Catalog): Question;
}

function base(c: Country, type: QuestionType): Question {
  return {
    id: `${type}:${c.iso3}`,
    type,
    countryCode: c.iso3,
    answerType: 'country',
    correctAnswers: [c.iso3],
    promptKey: `quiz.prompt.${type}`,
    promptParams: {},
    data: { kind: 'text' },
  };
}

function hasUniqueCapitals(c: Country, catalog: Catalog): boolean {
  return (
    c.capitalEligible &&
    c.capitals.length > 0 &&
    c.capitals.every(
      (capital) =>
        catalog.capital.find((a) => a.id === normalizeSearch(capital))?.countryCodes.length === 1,
    )
  );
}

/** Add a generator here; session balancing discovers the registered categories. */
export const generators: readonly QuestionGenerator[] = [
  {
    type: 'silhouette',
    eligible: (c) => !!c.geometry,
    build: (c) => ({
      ...base(c, 'silhouette'),
      data: { kind: 'silhouette', geometry: c.geometry! },
    }),
  },
  {
    type: 'flag',
    eligible: (c) => c.flagEligible && !!c.flag,
    build: (c) => ({ ...base(c, 'flag'), data: { kind: 'flag', src: c.flag } }),
  },
  {
    type: 'country-from-capital',
    eligible: (c, catalog) =>
      hasUniqueCapitals(c, catalog) &&
      !c.capitals.some((capital) => normalizeSearch(capital) === normalizeSearch(c.name)),
    build: (c) => ({
      ...base(c, 'country-from-capital'),
      promptKey:
        c.capitals.length > 1
          ? 'quiz.prompt.country-from-capitals'
          : 'quiz.prompt.country-from-capital',
      promptParams: { capital: c.capitals[0] },
    }),
  },
  {
    type: 'capital',
    eligible: hasUniqueCapitals,
    build: (c) => ({
      ...base(c, 'capital'),
      answerType: 'capital',
      correctAnswers: c.capitals.map(normalizeSearch),
      promptKey: c.capitals.length > 1 ? 'quiz.prompt.capitals' : 'quiz.prompt.capital',
      promptParams: { country: c.name },
    }),
  },
  {
    type: 'neighbors',
    eligible: (c, catalog) =>
      c.borders.length > 0 &&
      c.borders.every((code) => catalog.countries.some((other) => other.iso3 === code)) &&
      catalog.countries.filter((other) => c.borders.every((code) => other.borders.includes(code)))
        .length === 1,
    build: (c, catalog) => ({
      ...base(c, 'neighbors'),
      data: {
        kind: 'neighbors',
        names: c.borders
          .map((code) => catalog.countries.find((other) => other.iso3 === code)!.name)
          .sort((a, b) => a.localeCompare(b, 'fr')),
      },
    }),
  },
];
