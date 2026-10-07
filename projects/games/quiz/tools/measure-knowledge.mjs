import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
const stats = JSON.parse(await readFile('dist/portal/stats.json', 'utf8')),
  base = await readFile('tmp/knowledge-stats/baseline/stats.json', 'utf8')
    .then(JSON.parse)
    .catch(() => null);
const frozenBaseline = JSON.parse(
  await readFile('projects/games/quiz/tools/knowledge-budget-baseline.json', 'utf8'),
);

function find(graph, entry) {
  return Object.keys(graph.outputs).find((k) => graph.outputs[k].entryPoint?.endsWith(entry));
}
function closure(graph, roots) {
  const found = new Set();
  function visit(key) {
    if (!key || found.has(key)) return;
    found.add(key);
    for (const imp of graph.outputs[key]?.imports ?? []) {
      if (imp.kind !== 'dynamic-import' && !imp.external)
        visit(Object.hasOwn(graph.outputs, imp.path) ? imp.path : basename(imp.path));
    }
  }
  for (const root of roots) visit(root);
  return found;
}
const root = 'dist/portal/browser',
  baselineRoot = 'tmp/knowledge-stats/baseline';
async function size(keys, dir) {
  let bytes = 0;
  for (const key of keys) {
    if (!key.endsWith('.js')) continue;
    bytes += gzipSync(await readFile(join(dir, basename(key)))).length;
  }
  return bytes;
}
const main = find(stats, 'portal/src/main.ts'),
  quiz = find(stats, 'quiz/src/public-api.ts'),
  page = find(stats, 'quiz-page.ts'),
  three = find(stats, 'three-globe.ts'),
  statsPage = find(stats, 'quiz-statistics-page.ts');
const newFlow = closure(stats, [main, quiz, page]),
  oldFlow = base
    ? closure(base, [
        find(base, 'portal/src/main.ts'),
        find(base, 'quiz/src/public-api.ts'),
        find(base, 'quiz-page.ts'),
      ])
    : new Set();
const flowDelta =
  (await size(newFlow, root)) -
  (base ? await size(oldFlow, baselineRoot) : frozenBaseline.flowGzipBytes);
const dedicated = closure(stats, [statsPage, three]);
for (const k of closure(stats, [main])) dedicated.delete(k);
const statsBytes = await size(dedicated, root);
let assetBytes = 0;
for (const f of await readdir('content/geography/knowledge'))
  assetBytes += gzipSync(await readFile(join('content/geography/knowledge', f))).length;
const manifest = JSON.parse(await readFile('content/geography/knowledge/manifest.json', 'utf8'));
const engineChunks = Object.entries(stats.outputs)
  .filter(
    ([name, output]) =>
      name.endsWith('.js') &&
      Object.keys(output.inputs ?? {}).some((p) => p.includes('node_modules/three/build/three.')),
  )
  .map(([name]) => name);
const correction = find(stats, 'country-globe/globe-renderer.ts');
const sharedEngine =
  engineChunks.length === 1 &&
  engineChunks.every((k) => closure(stats, [three]).has(k) && closure(stats, [correction]).has(k));
const report = {
  baselineRef: frozenBaseline.ref,
  sharedThreeChunkCount: engineChunks.length,
  bothGlobesUseSameThree: sharedEngine,
  flowDeltaGzipBytes: flowDelta,
  statisticsAndGlobeGzipBytes: statsBytes,
  knowledgeAssetsGzipBytes: assetBytes,
  vertices: manifest.vertices,
  threeInInitial: engineChunks.some((k) => closure(stats, [main]).has(k)),
  threeInQuizFlow: engineChunks.some((k) => newFlow.has(k)),
  realMobilePerformance: 'not measured',
  gpuMemory: 'requires runtime estimate',
  heapMemory: 'requires runtime measurement',
};
await mkdir('tmp/knowledge-stats', { recursive: true });
await writeFile('tmp/knowledge-stats/bundle-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (
  !sharedEngine ||
  flowDelta > 10000 ||
  statsBytes > 250000 ||
  assetBytes > 500000 ||
  manifest.vertices > 50000 ||
  report.threeInInitial ||
  report.threeInQuizFlow
)
  process.exitCode = 1;
