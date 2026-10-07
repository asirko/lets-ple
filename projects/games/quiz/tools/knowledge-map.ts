import { geoGnomonic, geoStream, geoArea } from 'd3-geo';
import earcut from 'earcut';
import type { Geometry, Position } from '../src/lib/domain/types';
type Vec = readonly [number, number, number];
export interface CountryMesh {
  iso3: string;
  positions: number[];
  indices: number[];
  outlines: number[];
}
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (a: Vec): Vec => {
  const d = Math.hypot(...a);
  return [a[0] / d, a[1] / d, a[2] / d];
};
export const sphere = (p: readonly [number, number]): Vec => {
  const a = (p[0] * Math.PI) / 180,
    b = (p[1] * Math.PI) / 180;
  return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)];
};
function simplify(points: readonly Position[], tolerance: number): Position[] {
  const p: Position[] = [];
  let previous = points[0][0];
  for (const v of points) {
    let x = v[0];
    while (x - previous > 180) x -= 360;
    while (x - previous < -180) x += 360;
    p.push([x, v[1]]);
    previous = x;
  }
  function rdp(a: Position[]): Position[] {
    if (a.length < 3) return a;
    const first = a[0],
      last = a.at(-1)!;
    const dx = last[0] - first[0],
      dy = last[1] - first[1],
      length = dx * dx + dy * dy;
    let max = 0,
      index = 0;
    for (let i = 1; i < a.length - 1; i++) {
      const t = length
        ? Math.max(0, Math.min(1, ((a[i][0] - first[0]) * dx + (a[i][1] - first[1]) * dy) / length))
        : 0;
      const dist = Math.hypot(a[i][0] - first[0] - t * dx, a[i][1] - first[1] - t * dy);
      if (dist > max) {
        max = dist;
        index = i;
      }
    }
    return max > tolerance
      ? [...rdp(a.slice(0, index + 1)).slice(0, -1), ...rdp(a.slice(index))]
      : [first, last];
  }
  const split = Math.floor((p.length - 1) / 2);
  const out = [...rdp(p.slice(0, split + 1)).slice(0, -1), ...rdp(p.slice(split))];
  if (out.length >= 4) return out;
  let far = 1;
  for (let i = 1; i < p.length - 1; i++)
    if (
      Math.hypot(p[i][0] - p[0][0], p[i][1] - p[0][1]) >
      Math.hypot(p[far][0] - p[0][0], p[far][1] - p[0][1])
    )
      far = i;
  const dx = p[far][0] - p[0][0],
    dy = p[far][1] - p[0][1];
  let third = 1,
    max = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const a = Math.abs((p[i][0] - p[0][0]) * dy - (p[i][1] - p[0][1]) * dx);
    if (a > max) {
      max = a;
      third = i;
    }
  }
  const [a, b] = [far, third].sort((x, y) => x - y);
  return [p[0], p[a], p[b], p[0]];
}
function area(r: readonly (readonly number[])[]): number {
  return (
    r.reduce((s, p, i) => {
      const q = r[(i + 1) % r.length];
      return s + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2
  );
}
function inside(p: readonly number[], r: readonly (readonly number[])[]): boolean {
  let result = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i],
      b = r[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
export function buildCountryMesh(iso3: string, geometry: Geometry, tolerance = 0.12): CountryMesh {
  const mesh: CountryMesh = { iso3, positions: [], indices: [], outlines: [] };
  const pool = new Map<string, number>();
  const vertex = (v: Vec) => {
    const key = v.map((x) => x.toFixed(5)).join(',');
    let index = pool.get(key);
    if (index === undefined) {
      index = mesh.positions.length / 3;
      pool.set(key, index);
      mesh.positions.push(...v.map((x) => +x.toFixed(6)));
    }
    return index;
  };
  function triangle(a: Vec, b: Vec, c: Vec, depth = 0): void {
    const lengths = [
      Math.acos(Math.max(-1, Math.min(1, dot(a, b)))),
      Math.acos(Math.max(-1, Math.min(1, dot(b, c)))),
      Math.acos(Math.max(-1, Math.min(1, dot(c, a)))),
    ];
    const max = Math.max(...lengths);
    if (max > (5 * Math.PI) / 180 && depth < 12) {
      const i = lengths.indexOf(max),
        m = (x: Vec, y: Vec) => normalize([x[0] + y[0], x[1] + y[1], x[2] + y[2]]);
      if (i === 0) {
        const v = m(a, b);
        triangle(a, v, c, depth + 1);
        triangle(v, b, c, depth + 1);
      } else if (i === 1) {
        const v = m(b, c);
        triangle(a, b, v, depth + 1);
        triangle(a, v, c, depth + 1);
      } else {
        const v = m(c, a);
        triangle(a, b, v, depth + 1);
        triangle(v, b, c, depth + 1);
      }
      return;
    }
    const u = vertex(a),
      v = vertex(b),
      w = vertex(c);
    if (u !== v && v !== w && w !== u) mesh.indices.push(u, v, w);
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    const rings = polygon.map((r) => simplify(r, tolerance));
    let feature: { type: 'Polygon'; coordinates: number[][][] } = {
      type: 'Polygon',
      coordinates: rings.map((r) => r.map((p) => [p[0], p[1]])),
    };
    if (geoArea(feature) > 2 * Math.PI)
      feature = { ...feature, coordinates: feature.coordinates.map((r) => r.slice().reverse()) };
    for (const ring of rings)
      for (let i = 1; i < ring.length; i++)
        mesh.outlines.push(
          ...sphere(ring[i - 1]).map((x) => +x.toFixed(6)),
          ...sphere(ring[i]).map((x) => +x.toFixed(6)),
        );
    for (const rotation of [
      [0, 0],
      [90, 0],
      [180, 0],
      [-90, 0],
      [0, 90],
      [0, -90],
    ] as [number, number][]) {
      const projection = geoGnomonic()
        .rotate(rotation)
        .scale(1)
        .translate([0, 0])
        .clipAngle(89.999)
        .clipExtent([
          [-1, -1],
          [1, 1],
        ])
        .precision(0.02);
      const fragments: number[][][] = [];
      let ring: number[][] = [];
      geoStream(
        feature,
        projection.stream({
          point(x, y) {
            ring.push([x, y]);
          },
          lineStart() {
            ring = [];
          },
          lineEnd() {
            if (ring.length >= 3) fragments.push(ring);
          },
          polygonStart() {},
          polygonEnd() {},
          sphere() {},
        }),
      );
      const sorted = fragments.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
      const groups: { outer: number[][]; holes: number[][][] }[] = [];
      for (const r of sorted) {
        const container = groups.find((g) => inside(r[0], g.outer));
        if (container) container.holes.push(r);
        else groups.push({ outer: r, holes: [] });
      }
      for (const group of groups) {
        const flat: number[] = [];
        const holes: number[] = [];
        for (const [i, r] of [group.outer, ...group.holes].entries()) {
          if (i) holes.push(flat.length / 2);
          for (const p of r) flat.push(...p);
        }
        const indices = earcut(flat, holes);
        const vertices: Vec[] = [];
        for (let i = 0; i < flat.length; i += 2) {
          const lonlat = projection.invert!([flat[i], flat[i + 1]]);
          if (!lonlat) throw new Error('Invalid projection');
          vertices.push(sphere(lonlat));
        }
        for (let i = 0; i < indices.length; i += 3)
          triangle(vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]);
      }
    }
  }
  return mesh;
}
export function maxTriangleEdgeAngle(m: CountryMesh): number {
  let max = 0;
  const v = (i: number): Vec => m.positions.slice(i * 3, i * 3 + 3) as unknown as Vec;
  for (let i = 0; i < m.indices.length; i += 3) {
    const a = v(m.indices[i]),
      b = v(m.indices[i + 1]),
      c = v(m.indices[i + 2]);
    for (const [x, y] of [
      [a, b],
      [b, c],
      [c, a],
    ])
      max = Math.max(max, Math.acos(Math.max(-1, Math.min(1, dot(normalize(x), normalize(y))))));
  }
  return max;
}
export function coversPoint(m: CountryMesh, p: readonly [number, number]): boolean {
  const target = sphere(p),
    v = (i: number): Vec => m.positions.slice(i * 3, i * 3 + 3) as unknown as Vec;
  for (let i = 0; i < m.indices.length; i += 3) {
    const a = v(m.indices[i]),
      b = v(m.indices[i + 1]),
      c = v(m.indices[i + 2]);
    const s = [dot(cross(a, b), target), dot(cross(b, c), target), dot(cross(c, a), target)];
    if (
      (s.every((x) => x >= -1e-8) || s.every((x) => x <= 1e-8)) &&
      dot(normalize([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]), target) > 0
    )
      return true;
  }
  return false;
}
