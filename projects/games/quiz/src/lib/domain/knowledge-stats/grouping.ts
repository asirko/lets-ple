import { classifyKnowledge, type KnowledgeLevel } from './knowledge-level';
import { EMPTY_METRICS, type Metrics } from './statistics';
/** Scale at which the knowledge globe colors countries; coarser scales pool their answers. */
export type KnowledgeGrouping = 'continent' | 'region' | 'country';
export const KNOWLEDGE_GROUPINGS: readonly KnowledgeGrouping[] = ['continent', 'region', 'country'];
export interface GroupedCountry {
  readonly iso3: string;
  readonly continent: string;
  readonly subregion: string;
}
/** Pools answer-weighted metrics, as if every answer of the group had been counted together. */
export function mergeMetrics(all: readonly Metrics[]): Metrics {
  let count = 0,
    correct = 0,
    points = 0;
  for (const m of all) {
    count += m.count;
    correct += (m.successRate ?? 0) * m.count;
    points += (m.averageScore ?? 0) * m.count;
  }
  return count
    ? { count, successRate: correct / count, averageScore: points / count }
    : EMPTY_METRICS;
}
/** Level of every country, each one taking the level of its whole group at that scale. */
export function groupedLevels(
  countries: readonly GroupedCountry[],
  byCountry: ReadonlyMap<string, Metrics>,
  grouping: KnowledgeGrouping,
): Map<string, KnowledgeLevel> {
  const key = (c: GroupedCountry) =>
    grouping === 'continent' ? c.continent : grouping === 'region' ? c.subregion : c.iso3;
  const groups = new Map<string, Metrics[]>();
  for (const c of countries) {
    const metrics = byCountry.get(c.iso3) ?? EMPTY_METRICS;
    groups.set(key(c), [...(groups.get(key(c)) ?? []), metrics]);
  }
  const levels = new Map(
    [...groups].map(([group, all]) => [group, classifyKnowledge(mergeMetrics(all))]),
  );
  return new Map(countries.map((c) => [c.iso3, levels.get(key(c))!]));
}
export interface GroupLabel {
  readonly code: string;
  readonly name: string;
  /** [longitude, latitude] in degrees. */
  readonly anchor: readonly [number, number];
}
/**
 * One name per group, anchored on the spherical mean of its countries' anchors; `null` at the
 * country scale, where the countries name themselves.
 */
export function groupLabels(
  countries: readonly (GroupedCountry & { readonly anchor: readonly [number, number] })[],
  grouping: KnowledgeGrouping,
  name: (key: string) => string,
): GroupLabel[] | null {
  if (grouping === 'country') return null;
  const sums = new Map<string, [number, number, number]>();
  for (const c of countries) {
    const key = grouping === 'continent' ? c.continent : c.subregion;
    const [lon, lat] = c.anchor.map((v) => (v * Math.PI) / 180);
    const sum = sums.get(key) ?? [0, 0, 0];
    sum[0] += Math.cos(lat) * Math.sin(lon);
    sum[1] += Math.sin(lat);
    sum[2] += Math.cos(lat) * Math.cos(lon);
    sums.set(key, sum);
  }
  return [...sums].map(([key, [x, y, z]]) => ({
    code: key,
    name: name(key),
    anchor: [(Math.atan2(x, z) * 180) / Math.PI, (Math.atan2(y, Math.hypot(x, z)) * 180) / Math.PI],
  }));
}
