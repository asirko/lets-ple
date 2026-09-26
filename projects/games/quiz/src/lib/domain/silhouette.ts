import type { Geometry } from './types';

/** Equirectangular local projection with the cut placed in the largest empty longitude gap. */
export function silhouette(geometry: Geometry): {
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
      start = next % 360;
    }
  }
  const longitude = (x: number) => (((x + 360) % 360) - start + 360) % 360;
  const latitudes = points.map(([, y]) => y);
  const minLat = Math.min(...latitudes),
    maxLat = Math.max(...latitudes);
  const correction = Math.max(0.1, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  const width = Math.max(...points.map(([x]) => longitude(x))) * correction;
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
