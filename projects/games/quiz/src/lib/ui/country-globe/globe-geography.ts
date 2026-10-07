import type { Geometry, Position } from '../../domain/types';
export interface LabelCandidate {
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
}
const RAD = Math.PI / 180;
export function spherePoint([lon, lat]: Position): readonly [number, number, number] {
  return [
    Math.cos(lat * RAD) * Math.cos(lon * RAD),
    Math.sin(lat * RAD),
    -Math.cos(lat * RAD) * Math.sin(lon * RAD) || 0,
  ];
}
export function unwrapRing(ring: readonly Position[]): readonly Position[] {
  const points: Position[] = [];
  for (const [lon, lat] of ring) {
    const previous = points.at(-1)?.[0] ?? lon;
    points.push([lon + 360 * Math.round((previous - lon) / 360), lat]);
  }
  return points;
}
export function polygons(geometry: Geometry): readonly (readonly (readonly Position[])[])[] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}
/** The largest outer ring keeps remote territories from moving the initial camera. */
export function countryAnchor(geometry: Geometry): Position {
  let largest = 0,
    anchor: Position = [0, 0];
  for (const polygon of polygons(geometry)) {
    const ring = unwrapRing(polygon[0]);
    let twiceArea = 0,
      x = 0,
      y = 0;
    for (let i = 1; i < ring.length; i++) {
      const [a, b] = ring[i - 1],
        [c, d] = ring[i];
      const cross = a * d - c * b;
      twiceArea += cross;
      x += (a + c) * cross;
      y += (b + d) * cross;
    }
    const area = Math.abs(twiceArea);
    if (area > largest) {
      largest = area;
      const lon = x / (3 * twiceArea);
      anchor = [((((lon + 180) % 360) + 360) % 360) - 180, y / (3 * twiceArea)];
    }
  }
  return anchor;
}
export function placeLabels(
  candidates: readonly LabelCandidate[],
  width: number,
  height: number,
): readonly LabelCandidate[] {
  const result: LabelCandidate[] = [];
  for (const c of [...candidates].sort(
    (a, b) => b.priority - a.priority || a.code.localeCompare(b.code),
  )) {
    const left = c.x - c.width / 2,
      top = c.y - c.height / 2;
    if (left < 0 || top < 0 || left + c.width > width || top + c.height > height) continue;
    if (
      result.some(
        (a) =>
          Math.abs(a.x - c.x) < (a.width + c.width) / 2 + 4 &&
          Math.abs(a.y - c.y) < (a.height + c.height) / 2 + 4,
      )
    )
      continue;
    result.push(c);
  }
  return result;
}
/** Static orthographic country view; split hidden segments instead of drawing across the rear. */
export function staticGlobePath(geometry: Geometry, center: Position): string {
  const [lon, lat] = center.map((v) => v * RAD);
  let path = '';
  for (const polygon of polygons(geometry))
    for (const ring of polygon) {
      let pen = false;
      for (const [longitude, latitude] of ring) {
        const l = longitude * RAD - lon,
          b = latitude * RAD;
        const z = Math.sin(lat) * Math.sin(b) + Math.cos(lat) * Math.cos(b) * Math.cos(l);
        if (z < 0) {
          pen = false;
          continue;
        }
        const x = 150 + 142 * Math.cos(b) * Math.sin(l);
        const y =
          150 - 142 * (Math.cos(lat) * Math.sin(b) - Math.sin(lat) * Math.cos(b) * Math.cos(l));
        path += `${pen ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
        pen = true;
      }
      if (pen) path += 'Z';
    }
  return path;
}
