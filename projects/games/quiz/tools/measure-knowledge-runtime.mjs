import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { serveKnowledgeBuild, seedHistory } from './knowledge-browser-helpers.mjs';
const server = await serveKnowledgeBuild(),
  browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
  }),
  page = await context.newPage();
await page.addInitScript(() => {
  window.__knowledgeMeasure = { firstBatch: null, lastBatch: null, longTasks: [] };
  const original = IDBIndex.prototype.getAll;
  IDBIndex.prototype.getAll = function (...args) {
    const request = original.apply(this, args);
    if (this.name === 'sequence') {
      window.__knowledgeMeasure.firstBatch ??= performance.now();
      request.addEventListener(
        'success',
        () => (window.__knowledgeMeasure.lastBatch = performance.now()),
      );
    }
    return request;
  };
  new PerformanceObserver((list) => {
    window.__knowledgeMeasure.longTasks.push(
      ...list.getEntries().map((e) => ({ start: e.startTime, duration: e.duration })),
    );
  }).observe({ type: 'longtask', buffered: true });
});
try {
  await page.goto(server.origin + '/quiz/statistiques');
  await page.locator('canvas').waitFor();
  assert.equal(await page.locator('main').count(), 1);
  await page.screenshot({ path: 'tmp/knowledge-stats/globe-viewport.png' });
  await page.getByRole('button', { name: 'Liste accessible', exact: true }).click();
  await page.locator('canvas').waitFor({ state: 'detached' });
  const session = await context.newCDPSession(page);
  await session.send('Performance.enable');
  const heap = async () => {
    await session.send('HeapProfiler.collectGarbage');
    return (await session.send('Performance.getMetrics')).metrics.find(
      (m) => m.name === 'JSHeapUsedSize',
    ).value;
  };
  const baseline = await heap();
  const heaps = [];
  let framebufferBytes = 0;
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Globe', exact: true }).click();
    await page.locator('canvas').waitFor();
    framebufferBytes = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c.width * c.height * 40;
    });
    await page.getByRole('button', { name: 'Liste accessible', exact: true }).click();
    await page.locator('canvas').waitFor({ state: 'detached' });
    heaps.push(await heap());
  }
  await seedHistory(page, 100000);
  const start = performance.now();
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector('.quiz-stats-summary dd')?.textContent === '100000',
    null,
    { timeout: 60000 },
  );
  const readMs = performance.now() - start;
  const readMeasure = await page.evaluate(() => {
    const m = window.__knowledgeMeasure;
    return {
      batchReadToDisplayMilliseconds: performance.now() - m.firstBatch,
      lastBatchToDisplayMilliseconds: performance.now() - m.lastBatch,
      readLongTasks: m.longTasks.filter((t) => t.start >= m.firstBatch),
    };
  });
  const map = JSON.parse(await readFile('content/geography/knowledge/map.json', 'utf8'));
  const geometryBytes =
    map.countries.reduce(
      (n, m) =>
        n +
        Buffer.from(m.positions, 'base64').length * 2 +
        Buffer.from(m.outlines, 'base64').length * 2 +
        Buffer.from(m.indices, 'base64').length,
      0,
    ) + 200000;
  const report = {
    environment: 'Windows desktop Chromium, SwiftShader, 390x844 DPR 1; not mobile',
    initialHeapBytes: baseline,
    afterFiveDisposedVisitsHeapBytes: heaps,
    heapDeltaBytes: heaps.at(-1) - baseline,
    estimatedGpuBytes: geometryBytes + framebufferBytes,
    readAndDisplay100000Milliseconds: readMs,
    ...readMeasure,
    mobilePerformance: 'not verified',
    realBrowserZoom200: 'not verified',
  };
  await writeFile('tmp/knowledge-stats/runtime-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert(report.heapDeltaBytes < 50 * 1024 * 1024);
  assert(report.estimatedGpuBytes < 32 * 1024 * 1024);
} finally {
  await browser.close();
  await server.stop();
}
