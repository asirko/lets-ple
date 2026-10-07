import { describe, it, expect } from 'vitest';
import { buildCountryMesh, maxTriangleEdgeAngle, coversPoint } from './knowledge-map';
describe('spherical country meshes', () => {
  it('clips the antimeridian without globe-spanning triangles', () => {
    const m = buildCountryMesh('FJI', {
      type: 'Polygon',
      coordinates: [
        [
          [175, -20],
          [-175, -20],
          [-175, -10],
          [175, -10],
          [175, -20],
        ],
      ],
    });
    expect(m.indices.length).toBeGreaterThan(0);
    expect(m.positions.every(Number.isFinite)).toBe(true);
    expect(maxTriangleEdgeAngle(m)).toBeLessThanOrEqual((5 * Math.PI) / 180 + 1e-5);
  });
  it('preserves a hole and produces deterministic surfaces', () => {
    const shape = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [3, 3],
          [3, 7],
          [7, 7],
          [7, 3],
          [3, 3],
        ],
      ],
    };
    const m = buildCountryMesh('TST', shape);
    expect(m).toEqual(buildCountryMesh('TST', shape));
    // Point in spherical hole must never be covered by a planar cube-face triangle.
    expect(coversPoint(m, [5, 5])).toBe(false);
    expect(coversPoint(m, [1, 1])).toBe(true);
    expect(m.indices.length % 3).toBe(0);
  });
});

it('retains valid meshes and interior anchors for the 195 generated countries', async () => {
  const fs = await import('node:fs/promises');
  const map = JSON.parse(await fs.readFile('content/geography/knowledge/map.json', 'utf8'));
  const countries = JSON.parse(
    await fs.readFile('content/geography/knowledge/countries.json', 'utf8'),
  );
  expect(map.countries).toHaveLength(195);
  let vertices = 0;
  for (const row of map.countries) {
    const positions = Buffer.from(row.positions, 'base64'),
      indices = Buffer.from(row.indices, 'base64');
    const mesh = {
      iso3: row.iso3,
      positions: Array.from(
        { length: positions.length / 2 },
        (_, i) => positions.readInt16LE(i * 2) / 32767,
      ),
      indices: Array.from({ length: indices.length / 2 }, (_, i) => indices.readUInt16LE(i * 2)),
      outlines: [],
    };
    vertices += mesh.positions.length / 3;
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.indices.every((i: number) => i < mesh.positions.length / 3)).toBe(true);
    expect(maxTriangleEdgeAngle(mesh)).toBeLessThan((5.02 * Math.PI) / 180);
    expect(coversPoint(mesh, countries.find((c: any) => c.iso3 === row.iso3).anchor)).toBe(true);
  }
  expect(vertices).toBeLessThan(50000);
});
