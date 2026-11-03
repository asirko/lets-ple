import { describe, it, expect } from 'vitest';
import { groupLabels, groupedLevels, mergeMetrics } from './grouping';
const countries = [
  { iso3: 'FRA', continent: 'Europe', subregion: 'Western Europe' },
  { iso3: 'BEL', continent: 'Europe', subregion: 'Western Europe' },
  { iso3: 'POL', continent: 'Europe', subregion: 'Central Europe' },
  { iso3: 'JPN', continent: 'Asia', subregion: 'Eastern Asia' },
];
const byCountry = new Map([
  ['FRA', { count: 3, successRate: 1, averageScore: 4 }],
  ['BEL', { count: 2, successRate: 0.5, averageScore: 2.5 }],
  ['POL', { count: 5, successRate: 0, averageScore: 0 }],
]);
describe('knowledge grouping', () => {
  it('weights merged metrics by answer count', () => {
    expect(mergeMetrics([...byCountry.values()].slice(0, 2))).toEqual({
      count: 5,
      successRate: 0.8,
      averageScore: 3.4,
    });
    expect(mergeMetrics([]).count).toBe(0);
  });
  it('gives each country the level of its group at the chosen scale', () => {
    expect(groupedLevels(countries, byCountry, 'country')).toEqual(
      new Map([
        ['FRA', 'insufficient'],
        ['BEL', 'insufficient'],
        ['POL', 'low'],
        ['JPN', 'none'],
      ]),
    );
    expect(groupedLevels(countries, byCountry, 'region')).toEqual(
      new Map([
        ['FRA', 'medium'],
        ['BEL', 'medium'],
        ['POL', 'low'],
        ['JPN', 'none'],
      ]),
    );
    // 10 answers, 17 points: average 1.7.
    expect(groupedLevels(countries, byCountry, 'continent').get('FRA')).toBe('low');
    expect(groupedLevels(countries, byCountry, 'continent').get('JPN')).toBe('none');
  });
  it('names each group once, at the spherical mean of its countries', () => {
    const anchored = [
      { iso3: 'FJI', continent: 'Oceania', subregion: 'Melanesia', anchor: [178, -18] as const },
      { iso3: 'WSM', continent: 'Oceania', subregion: 'Polynesia', anchor: [-172, -14] as const },
      { iso3: 'FRA', continent: 'Europe', subregion: 'Western Europe', anchor: [2, 46] as const },
    ];
    expect(groupLabels(anchored, 'country', (k) => k)).toBeNull();
    const labels = groupLabels(anchored, 'continent', (k) => k.toUpperCase())!;
    expect(labels.map((l) => l.name)).toEqual(['OCEANIA', 'EUROPE']);
    // Across the antimeridian: the mean stays in the Pacific, not near Greenwich.
    const [lon, lat] = labels[0].anchor;
    expect(Math.abs(lon)).toBeGreaterThan(170);
    expect(lat).toBeCloseTo(-16, 0);
    expect(labels[1].anchor[0]).toBeCloseTo(2);
    expect(groupLabels(anchored, 'region', (k) => k)).toHaveLength(3);
  });
});
