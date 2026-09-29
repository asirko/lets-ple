import { expect, it } from 'vitest';
import { silhouette } from './silhouette';
import { readFileSync } from 'node:fs';
import type { Country } from './types';

const approved = [
  'BLZ',
  'CIV',
  'GIN',
  'IRL',
  'JAM',
  'MEX',
  'PAN',
  'PER',
  'DOM',
  'SLE',
  'SUR',
  'TTO',
  'URY',
];
const corpus = JSON.parse(readFileSync('content/geography/countries.json', 'utf8')) as Country[];

it.each(approved)('utilise le cadrage validé pour %s', (code) => {
  const country = corpus.find((country) => country.iso3 === code)!;
  const result = silhouette(country.geometry!, code);
  const points = [...result.path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)];
  const xs = points.map((point) => Number(point[1]));
  const ys = points.map((point) => Number(point[2]));
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  expect(Math.min(...xs)).toBeGreaterThanOrEqual(19.99);
  expect(Math.max(...xs)).toBeLessThanOrEqual(460.01);
  expect(Math.max(width / 440, height / 260)).toBeCloseTo(1, 2);
  // Aucun contour ne doit traverser artificiellement presque toute la carte.
  const jumps = points
    .slice(1)
    .filter((point, i) => point[0][0] === 'L' && Math.abs(Number(point[1]) - xs[i]) > 400);
  expect(jumps).toHaveLength(0);
});

it('projette un contour détaillé sans dépasser la limite des arguments JavaScript', () => {
  const ring: [number, number][] = Array.from({ length: 150000 }, (_, i) => [
    Math.cos(i / 1000),
    Math.sin(i / 1000),
  ]);
  ring.push(ring[0]);
  expect(silhouette({ type: 'Polygon', coordinates: [ring] }).path).not.toMatch(/NaN|Infinity/);
});

it('centre tous les polygones et conserve les trous', () => {
  const result = silhouette({
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 2],
      ],
    ],
  });
  expect(result.path.match(/M/g)).toHaveLength(2);
  expect(result.path).not.toMatch(/NaN|Infinity/);
  expect(result.viewBox).toBe('0 0 480 300');
});

it('rapproche les îles de part et d’autre de l’antéméridien', () => {
  const result = silhouette({
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [179, 0],
          [180, 0],
          [180, 1],
          [179, 0],
        ],
      ],
      [
        [
          [-180, 0],
          [-179, 0],
          [-179, 1],
          [-180, 0],
        ],
      ],
    ],
  });
  expect(result.longitudeSpan).toBe(2);
  expect(result.path.match(/M/g)).toHaveLength(2);
});
