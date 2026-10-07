import type { Metrics } from '../domain/knowledge-stats/statistics';
import type { KnowledgeLevel } from '../domain/knowledge-stats/knowledge-level';
import type { KnowledgeCountry } from '../data/knowledge-data';
export type StatsLabels = Readonly<Record<string, string>>;
export interface CountryRow extends KnowledgeCountry {
  metrics: Metrics;
  level: KnowledgeLevel;
}
export interface BreakdownRow {
  key: string;
  label: string;
  metrics: Metrics;
}
export interface WeekRow {
  label: string;
  current: boolean;
  metrics: Metrics;
}
export function score(value: number | null, na: string): string {
  return value === null
    ? na
    : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}
export function rate(value: number | null, na: string): string {
  return value === null
    ? na
    : new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 }).format(value);
}
