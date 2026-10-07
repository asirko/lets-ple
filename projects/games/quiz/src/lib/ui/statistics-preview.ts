import { EMPTY_METRICS } from '../domain/knowledge-stats/statistics';
import type { CountryRow } from './statistics-models';
export const STATISTICS_PREVIEW = {
  metrics: { count: 14, successRate: 0.71, averageScore: 3.4 },
  labels: {},
  types: [
    {
      key: 'flag',
      label: 'Drapeaux',
      metrics: { count: 14, successRate: 0.71, averageScore: 3.4 },
    },
  ],
  rows: [
    {
      iso3: 'FRA',
      name: 'France',
      continent: 'Europe',
      anchor: [2, 46],
      metrics: { count: 14, successRate: 0.71, averageScore: 3.4 },
      level: 'medium',
    },
    {
      iso3: 'FJI',
      name: 'Fidji',
      continent: 'Oceania',
      anchor: [178, -18],
      metrics: EMPTY_METRICS,
      level: 'none',
    },
  ] as CountryRow[],
};
