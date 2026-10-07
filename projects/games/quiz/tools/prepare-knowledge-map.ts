import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { geoCentroid } from 'd3-geo';
import { buildCountryMesh, coversPoint } from './knowledge-map';
import type { Country } from '../src/lib/domain/types';
async function main() {
  const source = await readFile('content/geography/countries.json');
  const countries: Country[] = JSON.parse(source.toString());
  const version = createHash('sha256').update(source).digest('hex');

  const meshes = countries
    .filter((c) => c.geometry)
    .map((c) => buildCountryMesh(c.iso3, c.geometry!, 0.08));
  const metadata = countries.map((c) => {
    const mesh = meshes.find((m) => m.iso3 === c.iso3);
    let anchor = c.geometry ? geoCentroid(c.geometry as never) : [0, 0];
    if (mesh && !coversPoint(mesh, anchor)) {
      let best = -1,
        center = [0, 0, 1];
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const points = mesh.indices
          .slice(i, i + 3)
          .map((n) => mesh.positions.slice(n * 3, n * 3 + 3));
        const u = points[1].map((v, k) => v - points[0][k]),
          v = points[2].map((v, k) => v - points[0][k]);
        const area = Math.hypot(
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        );
        if (area > best) {
          best = area;
          center = points[0].map((_, k) => points.reduce((n, p) => n + p[k], 0));
        }
      }
      const length = Math.hypot(...center);
      anchor = [
        (Math.atan2(center[0], center[2]) * 180) / Math.PI,
        (Math.asin(center[1] / length) * 180) / Math.PI,
      ];
    }
    return { iso3: c.iso3, name: c.name, continent: c.continent, anchor };
  });
  const encodePositions = (values: number[]) =>
    Buffer.from(new Int16Array(values.map((x) => Math.round(x * 32767))).buffer).toString('base64');
  const map = {
    version: 1,
    countries: meshes.map((m) => ({
      iso3: m.iso3,
      positions: encodePositions(m.positions),
      indices: Buffer.from(new Uint16Array(m.indices).buffer).toString('base64'),
      outlines: encodePositions(m.outlines),
    })),
  };
  const manifest = {
    version: 1,
    corpusVersion: version,
    source: 'Natural Earth 5.1.2; derived from local pinned countries.json',
    license: 'Public domain geometry / ODbL-1.0 metadata',
    transformations:
      '0.08 degree RDP; six spherical cube-face gnomonic clips; earcut with holes; spherical subdivision edges <=5 degrees; unit coordinates quantized Int16, indices Uint16, base64 little-endian buffers',
    vertices: meshes.reduce((n, m) => n + m.positions.length / 3, 0),
  };
  const files = { 'countries.json': metadata, 'map.json': map, 'manifest.json': manifest };
  await mkdir('content/geography/knowledge', { recursive: true });
  let bytes = 0;
  for (const [name, value] of Object.entries(files)) {
    const data = JSON.stringify(value);
    bytes += gzipSync(data).length;
    await writeFile('content/geography/knowledge/' + name, data + '\n');
  }
  console.log(JSON.stringify({ gzipBytes: bytes, vertices: manifest.vertices }));
  if (bytes > 600_000 || manifest.vertices > 50_000)
    throw new Error('Knowledge map exceeds approved budget');
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
