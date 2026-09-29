import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeSearch } from './normalize';
import { createCatalog, searchAnswers } from './catalog';
import { generateQuestions, optionsFor } from './questions';
import { createGame, reduceGame } from './game';
import { generators } from './generators';
import type { Country, Mode } from './types';

const countries = JSON.parse(readFileSync('content/geography/countries.json', 'utf8')) as Country[];
const catalog = createCatalog(countries);
function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe('normalisation et domaines', () => {
  it.each(['Côte d’Ivoire', "cote d'ivoire", 'COTE DIVOIRE', 'côte divoire'])(
    'retrouve %s',
    (text) => {
      expect(normalizeSearch(text)).toBe('cotedivoire');
      expect(searchAnswers(catalog.country, text).map((a) => a.id)).toContain('CIV');
    },
  );
  it('préserve la distinction entre fautes et accents, et masque la liste vide', () => {
    expect(normalizeSearch('São Tomé')).toBe('saotome');
    expect(normalizeSearch('Pariss')).not.toBe(normalizeSearch('Paris'));
    expect(searchAnswers(catalog.country, '')).toEqual([]);
    expect(searchAnswers(catalog.country, '---')).toEqual([]);
  });
  it('couvre tous les pays et toutes les capitales, y compris les capitales multiples', () => {
    expect(catalog.country).toHaveLength(195);
    for (const c of countries)
      for (const capital of c.capitals) {
        expect(catalog.capital.some((a) => a.label === capital)).toBe(true);
      }
    expect(searchAnswers(catalog.capital, 'pretoria')[0].label).toBe('Pretoria');
    expect(searchAnswers(catalog.capital, 'le cap')[0].label).toBe('Le Cap');
    expect(searchAnswers(catalog.capital, 'france')).toEqual([]);
    expect(searchAnswers(catalog.country, 'tokyo')).toEqual([]);
  });
});

describe('générateurs', () => {
  it('exclut les quatre silhouettes illisibles sans retirer leurs drapeaux ni leurs réponses', () => {
    const shape = generators.find((g) => g.type === 'silhouette')!;
    const flag = generators.find((g) => g.type === 'flag')!;
    const excluded = ['MHL', 'KIR', 'MDV', 'FSM'];
    expect(
      countries
        .filter((c) => c.geometry && !shape.eligible(c, catalog))
        .map((c) => c.iso3)
        .sort(),
    ).toEqual([...excluded].sort());
    for (const code of excluded) {
      const country = countries.find((c) => c.iso3 === code)!;
      expect(flag.eligible(country, catalog)).toBe(true);
      expect(catalog.country.some((answer) => answer.id === code)).toBe(true);
    }
    for (let seed = 0; seed < 30; seed++) {
      expect(
        generateQuestions(catalog, random(seed), ['silhouette']).every(
          (q) => !excluded.includes(q.countryCode),
        ),
      ).toBe(true);
    }
  });
  it('ne propose aucun voisin cité et privilégie leurs propres voisins', () => {
    const generator = generators.find((g) => g.type === 'neighbors')!;
    for (const country of countries.filter((c) => generator.eligible(c, catalog))) {
      const q = generator.build(country, catalog);
      const secondDegree = new Set(
        countries
          .filter((c) => country.borders.includes(c.iso3))
          .flatMap((c) => c.borders)
          .filter((code) => code !== country.iso3 && !country.borders.includes(code)),
      );
      for (const mode of ['carre', 'duo'] as const) {
        const options = optionsFor(q, catalog, mode, random(42));
        expect(options.every((a) => !country.borders.includes(a.id))).toBe(true);
        const wrong = options.filter((a) => a.id !== country.iso3);
        expect(wrong.filter((a) => secondDegree.has(a.id))).toHaveLength(
          Math.min(wrong.length, secondDegree.size),
        );
      }
    }
  });
  it('répartit dix questions entre les catégories sélectionnées uniquement', () => {
    for (const enabled of [['flag'], ['neighbors', 'capital']] as const) {
      const questions = generateQuestions(catalog, random(5), enabled);
      expect(questions).toHaveLength(10);
      expect(new Set(questions.map((q) => q.countryCode)).size).toBe(10);
      expect(questions.every((q) => (enabled as readonly string[]).includes(q.type))).toBe(true);
      for (const type of enabled)
        expect(questions.filter((q) => q.type === type)).toHaveLength(10 / enabled.length);
    }
    expect(() => generateQuestions(catalog, random(1), [])).toThrow('No eligible');
  });
  it('produit dix pays distincts, deux questions de chaque catégorie, sans types consécutifs', () => {
    for (let seed = 1; seed < 60; seed++) {
      const questions = generateQuestions(catalog, random(seed));
      expect(questions).toHaveLength(10);
      expect(new Set(questions.map((q) => q.countryCode)).size).toBe(10);
      for (const type of generators.map((g) => g.type))
        expect(questions.filter((q) => q.type === type)).toHaveLength(2);
      questions.slice(1).forEach((q, i) => expect(q.type).not.toBe(questions[i].type));
    }
  });
  it('donne un domaine approprié et exactement une bonne option sans doublons', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed < 80; seed++)
      for (const q of generateQuestions(catalog, random(seed))) {
        for (const [mode, count] of [
          ['carre', 4],
          ['duo', 2],
        ] as const) {
          const answers = optionsFor(q, catalog, mode, random(seed + 1));
          expect(answers).toHaveLength(count);
          expect(new Set(answers.map((a) => normalizeSearch(a.label))).size).toBe(count);
          expect(answers.filter((a) => q.correctAnswers.includes(a.id))).toHaveLength(1);
          expect(answers.every((a) => catalog[q.answerType].includes(a))).toBe(true);
          if (mode === 'carre')
            positions.add(answers.findIndex((a) => q.correctAnswers.includes(a.id)));
        }
      }
    expect(positions.size).toBe(4);
  });
  it('privilégie les voisins pour les distracteurs de pays et capitales', () => {
    const spain = countries.find((c) => c.iso3 === 'ESP')!;
    for (const type of ['capital', 'country-from-capital'] as const) {
      const q = generators.find((g) => g.type === type)!.build(spain, catalog);
      const incorrect = optionsFor(q, catalog, 'carre', random(1)).filter(
        (a) => !q.correctAnswers.includes(a.id),
      );
      expect(
        incorrect.every((a) => a.countryCodes.some((code) => spain.borders.includes(code))),
      ).toBe(true);
    }
  });
  it('ne pose pas de question de voisins vide ou ambiguë', () => {
    const generator = generators.find((g) => g.type === 'neighbors')!;
    expect(
      generator.eligible(
        countries.find((c) => c.iso3 === 'JPN')!,
        catalog,
      ),
    ).toBe(false);
    for (const c of countries.filter((c) => generator.eligible(c, catalog))) {
      const matches = countries.filter((other) =>
        c.borders.every((code) => other.borders.includes(code)),
      );
      expect(matches.map((c) => c.iso3)).toEqual([c.iso3]);
    }
  });
  it('ne propose pas une capitale partagée ou un cas ambigu', () => {
    for (const type of ['capital', 'country-from-capital'] as const) {
      const generator = generators.find((g) => g.type === type)!;
      expect(
        generator.eligible(
          countries.find((c) => c.iso3 === 'BOL')!,
          catalog,
        ),
      ).toBe(false);
    }
  });
});

describe('partie', () => {
  it.each([
    ['cash', 5],
    ['carre', 3],
    ['duo', 1],
  ] as const)('%s attribue %i points une seule fois', (mode, points) => {
    const initial = createGame(catalog, random(12));
    const selected = reduceGame(initial, { type: 'mode', mode }, catalog, random(1));
    const q = selected.questions[0];
    const answer = catalog[q.answerType].find((a) => q.correctAnswers.includes(a.id))!;
    const input = mode === 'cash' ? answer.label : answer.id;
    const corrected = reduceGame(selected, { type: 'answer', value: input }, catalog);
    expect(corrected.score).toBe(points);
    expect(corrected.correctCount).toBe(1);
    expect(corrected.phase).toBe('correction');
    expect(reduceGame(corrected, { type: 'answer', value: input }, catalog)).toBe(corrected);
    expect(reduceGame(selected, { type: 'mode', mode: 'cash' }, catalog)).toBe(selected);
    expect(initial.score).toBe(0);
  });
  it('refuse de répondre avant un mode, de sauter une question et les choix absents', () => {
    const initial = createGame(catalog, random(8));
    expect(reduceGame(initial, { type: 'next' }, catalog)).toBe(initial);
    expect(reduceGame(initial, { type: 'answer', value: 'Paris' }, catalog)).toBe(initial);
    const selected = reduceGame(initial, { type: 'mode', mode: 'duo' }, catalog, random(4));
    expect(reduceGame(selected, { type: 'answer', value: 'absent' }, catalog)).toBe(selected);
  });
  it('termine après dix corrections et conserve le compte de mauvaises réponses', () => {
    let state = createGame(catalog, random(9));
    for (let i = 0; i < 10; i++) {
      expect(state.index).toBe(i);
      state = reduceGame(state, { type: 'mode', mode: 'cash' }, catalog);
      const q = state.questions[i];
      const answer = catalog[q.answerType].find((a) => !q.correctAnswers.includes(a.id))!;
      state = reduceGame(state, { type: 'answer', value: answer.label }, catalog);
      expect(state.phase).toBe('correction');
      state = reduceGame(state, { type: 'next' }, catalog);
    }
    expect(state.phase).toBe('finished');
    expect(state.score).toBe(0);
    expect(state.wrongCount).toBe(10);
    expect(reduceGame(state, { type: 'next' }, catalog)).toBe(state);
    const fresh = createGame(catalog, random(4));
    expect(fresh.index).toBe(0);
    expect(fresh.correctCount + fresh.wrongCount).toBe(0);
  });
  it('accepte une capitale normalisée, refuse les fautes et garde la saisie hors domaine modifiable', () => {
    const q = generators
      .find((g) => g.type === 'capital')!
      .build(
        countries.find((c) => c.iso3 === 'STP')!,
        catalog,
      );
    const state = {
      ...createGame(catalog, random(1)),
      questions: [q],
      phase: 'answering' as const,
      mode: 'cash' as Mode,
    };
    expect(reduceGame(state, { type: 'answer', value: 'sao tome' }, catalog).score).toBe(5);
    expect(reduceGame(state, { type: 'answer', value: 'sao tomme' }, catalog)).toBe(state);
  });
});
