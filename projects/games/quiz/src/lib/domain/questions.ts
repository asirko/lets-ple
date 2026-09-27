import type { Catalog } from './catalog';
import { generators } from './generators';
import type { Answer, Mode, Question, QuestionType, Random } from './types';
import { QUESTION_TYPES } from './preferences';

export function shuffle<T>(values: readonly T[], random: Random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQuestions(
  catalog: Catalog,
  random: Random,
  enabled: readonly QuestionType[] = QUESTION_TYPES,
): readonly Question[] {
  const available = generators
    .filter((generator) => enabled.includes(generator.type))
    .map((generator) => ({
      generator,
      candidates: catalog.countries.filter((c) => generator.eligible(c, catalog)),
    }))
    .filter((pool) => pool.candidates.length > 0);
  if (!available.length) throw new Error('No eligible geography questions');
  const questions: Question[] = [];
  const used = new Set<string>();
  // Round-robin shuffled batches balance registered types without a fixed order.
  while (questions.length < 10) {
    const batch = shuffle(available, random);
    if (batch.length > 1 && batch[0].generator.type === questions.at(-1)?.type) {
      [batch[0], batch[1]] = [batch[1], batch[0]];
    }
    for (const { generator, candidates } of batch) {
      if (questions.length === 10) break;
      const unused = candidates.filter((c) => !used.has(c.iso3));
      if (!unused.length) throw new Error('Insufficient distinct countries for a balanced session');
      const country = unused[Math.floor(random() * unused.length)];
      questions.push(generator.build(country, catalog));
      used.add(country.iso3);
    }
  }
  return questions;
}

export function optionsFor(
  question: Question,
  catalog: Catalog,
  mode: Exclude<Mode, 'cash'>,
  random: Random,
): readonly Answer[] {
  const domain = catalog[question.answerType];
  const correct = domain.filter((a) => question.correctAnswers.includes(a.id));
  const country = catalog.countries.find((c) => c.iso3 === question.countryCode)!;
  const isNeighbors = question.type === 'neighbors';
  const preferred = isNeighbors
    ? new Set(
        catalog.countries.filter((c) => country.borders.includes(c.iso3)).flatMap((c) => c.borders),
      )
    : new Set(country.borders);
  const rank = (answer: Answer): number =>
    Math.min(
      ...answer.countryCodes.map((code) => {
        const candidate = catalog.countries.find((c) => c.iso3 === code)!;
        if (preferred.has(code)) return 0;
        if (candidate.subregion === country.subregion) return 1;
        if (candidate.continent === country.continent) return 2;
        return 3;
      }),
    );
  const distractors = shuffle(
    domain.filter(
      (a) =>
        !question.correctAnswers.includes(a.id) &&
        (!isNeighbors || !a.countryCodes.some((code) => country.borders.includes(code))),
    ),
    random,
  ).sort((a, b) => rank(a) - rank(b));
  const count = mode === 'carre' ? 3 : 1;
  if (!correct.length || distractors.length < count) throw new Error('Insufficient answer domain');
  return shuffle(
    [correct[Math.floor(random() * correct.length)], ...distractors.slice(0, count)],
    random,
  );
}
