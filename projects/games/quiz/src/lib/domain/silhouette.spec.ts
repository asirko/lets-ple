import { expect, it } from 'vitest';
import { silhouette } from './silhouette';

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
