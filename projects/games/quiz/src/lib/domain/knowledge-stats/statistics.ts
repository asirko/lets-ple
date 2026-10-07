import type { QuizAnswerEventV1 } from './events';
export interface StatsFilters {
  readonly continent: string | null;
  readonly mode: string | null;
}
export interface Metrics {
  readonly count: number;
  readonly successRate: number | null;
  readonly averageScore: number | null;
}
export interface WeekWindow {
  readonly startMs: number;
  readonly endMs: number;
  readonly current: boolean;
}
interface Totals {
  count: number;
  correct: number;
  points: number;
}
export interface StatsAccumulator {
  filters: StatsFilters;
  windows: readonly WeekWindow[];
  overall: Totals;
  byCountry: Map<string, Totals>;
  byContinent: Map<string, Totals>;
  byType: Map<string, Totals>;
  byMode: Map<string, Totals>;
  countryTypes: Map<string, Set<string>>;
  countryByType: Map<string, Totals>;
  countryByMode: Map<string, Totals>;
  weeks: Totals[];
}
export interface StatsResult {
  overall: Metrics;
  byCountry: Map<string, Metrics>;
  byContinent: Map<string, Metrics>;
  byType: Map<string, Metrics>;
  byMode: Map<string, Metrics>;
  countryTypes: Map<string, Set<string>>;
  countryByType: Map<string, Metrics>;
  countryByMode: Map<string, Metrics>;
  weeks: readonly { window: WeekWindow; metrics: Metrics }[];
}
const zero = (): Totals => ({ count: 0, correct: 0, points: 0 });
const metrics = (t: Totals): Metrics => ({
  count: t.count,
  successRate: t.count ? t.correct / t.count : null,
  averageScore: t.count ? t.points / t.count : null,
});
export function createAccumulator(
  filters: StatsFilters,
  windows: readonly WeekWindow[],
): StatsAccumulator {
  return {
    filters,
    windows,
    overall: zero(),
    byCountry: new Map(),
    byContinent: new Map(),
    byType: new Map(),
    byMode: new Map(),
    countryTypes: new Map(),
    countryByType: new Map(),
    countryByMode: new Map(),
    weeks: windows.map(zero),
  };
}
function increment(t: Totals, e: QuizAnswerEventV1): void {
  t.count++;
  t.correct += Number(e.correct);
  t.points += e.pointsAwarded;
}
export function addAnswers(acc: StatsAccumulator, events: readonly QuizAnswerEventV1[]): void {
  for (const e of events) {
    if (
      (acc.filters.continent && e.continent !== acc.filters.continent) ||
      (acc.filters.mode && e.mode !== acc.filters.mode)
    )
      continue;
    increment(acc.overall, e);
    for (const [map, key] of [
      [acc.byCountry, e.countryIso3],
      [acc.byContinent, e.continent],
      [acc.byType, e.questionType],
      [acc.byMode, e.mode],
      [acc.countryByType, e.countryIso3 + '|' + e.questionType],
      [acc.countryByMode, e.countryIso3 + '|' + e.mode],
    ] as const) {
      let t = map.get(key);
      if (!t) {
        t = zero();
        map.set(key, t);
      }
      increment(t, e);
    }
    const types = acc.countryTypes.get(e.countryIso3) ?? new Set<string>();
    types.add(e.questionType);
    acc.countryTypes.set(e.countryIso3, types);
    const time = Date.parse(e.occurredAt);
    acc.windows.forEach((w, i) => {
      if (time >= w.startMs && time < w.endMs) increment(acc.weeks[i], e);
    });
  }
}
export function finishStatistics(acc: StatsAccumulator): StatsResult {
  const convert = (m: Map<string, Totals>) => new Map([...m].map(([k, v]) => [k, metrics(v)]));
  return {
    overall: metrics(acc.overall),
    byCountry: convert(acc.byCountry),
    byContinent: convert(acc.byContinent),
    byType: convert(acc.byType),
    byMode: convert(acc.byMode),
    countryByType: convert(acc.countryByType),
    countryByMode: convert(acc.countryByMode),
    countryTypes: new Map([...acc.countryTypes].map(([k, v]) => [k, new Set(v)])),
    weeks: acc.windows.map((window, i) => ({ window, metrics: metrics(acc.weeks[i]) })),
  };
}
export const EMPTY_METRICS: Metrics = { count: 0, successRate: null, averageScore: null };
