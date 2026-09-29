import type { Geometry } from './types';

/** Silhouettes écartées après revue visuelle ; pays conservés dans les autres catégories. */
export const EXCLUDED_SILHOUETTE_COUNTRIES: ReadonlySet<string> = new Set([
  'MHL',
  'KIR',
  'MDV',
  'FSM',
]);

/** Pays dont le nouveau cadrage a été validé lors de la revue visuelle. */
export const APPROVED_SILHOUETTE_COUNTRIES: ReadonlySet<string> = new Set([
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
]);

export function silhouette(geometry: Geometry, countryCode = '') {
  return projectSilhouette(geometry, APPROVED_SILHOUETTE_COUNTRIES.has(countryCode));
}

/** Aperçu de revue pour les pays dont le cadrage n’est pas encore validé. */
export function correctedSilhouette(geometry: Geometry) {
  return projectSilhouette(geometry, true);
}

/** Equirectangular local projection with the cut placed in the largest empty longitude gap. */
function projectSilhouette(
  geometry: Geometry,
  corrected: boolean,
): {
  path: string;
  viewBox: string;
  longitudeSpan: number;
} {
  const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
  const points = rings.flat();
  const longitudes = points.map(([x]) => (x + 360) % 360).sort((a, b) => a - b);
  let gap = -1;
  let start = 0;
  for (let i = 0; i < longitudes.length; i++) {
    const next = longitudes[(i + 1) % longitudes.length] + (i === longitudes.length - 1 ? 360 : 0);
    if (next - longitudes[i] > gap) {
      gap = next - longitudes[i];
      // L'aller-retour +360/-360 peut déplacer la coupure d'un epsilon,
      // projetant alors le point le plus à l'ouest à presque 360°.
      start = corrected ? longitudes[(i + 1) % longitudes.length] : next % 360;
    }
  }
  const longitude = (x: number) => (((x + 360) % 360) - start + 360) % 360;
  let minLat = Infinity,
    maxLat = -Infinity,
    longitudeWidth = 0;
  // Detailed coastlines can exceed the engine's function-argument limit.
  for (const [x, y] of points) {
    minLat = Math.min(minLat, y);
    maxLat = Math.max(maxLat, y);
    longitudeWidth = Math.max(longitudeWidth, longitude(x));
  }
  const correction = Math.max(0.1, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  const width = longitudeWidth * correction;
  const height = maxLat - minLat;
  const scale = Math.min(440 / Math.max(width, 0.001), 260 / Math.max(height, 0.001));
  const left = (480 - width * scale) / 2,
    top = (300 - height * scale) / 2;
  const path = rings
    .map(
      (ring) =>
        ring
          .map(
            ([x, y], i) =>
              `${i ? 'L' : 'M'}${(left + longitude(x) * correction * scale).toFixed(2)},${(top + (maxLat - y) * scale).toFixed(2)}`,
          )
          .join(' ') + 'Z',
    )
    .join(' ');
  return { path, viewBox: '0 0 480 300', longitudeSpan: 360 - gap };
}
