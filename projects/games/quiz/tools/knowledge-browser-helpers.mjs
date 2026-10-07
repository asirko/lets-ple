import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
export async function serveKnowledgeBuild() {
  const root = resolve('dist/portal/browser');
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
  };
  const server = createServer(async (req, res) => {
    try {
      let p = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
      if (!p.startsWith(root + sep)) throw Error('outside root');
      try {
        if (!(await stat(p)).isFile()) throw Error();
      } catch {
        if (extname(p)) {
          res.writeHead(404).end();
          return;
        }
        p = resolve(root, 'index.html');
      }
      res.writeHead(200, {
        'Content-Type': mime[extname(p)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(await readFile(p));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    stop: () => new Promise((done) => server.close(done)),
    server,
  };
}
export async function waitInstallation(page) {
  const manifest = JSON.parse(await readFile('dist/portal/browser/ngsw.json', 'utf8'));
  const urls = manifest.assetGroups
    .filter((g) => g.installMode === 'prefetch')
    .flatMap((g) => g.urls);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 });
  await page.waitForFunction(
    async (urls) => {
      const seen = new Set();
      for (const name of (await caches.keys()).filter((n) => n.endsWith(':cache'))) {
        const c = await caches.open(name);
        for (const r of await c.keys()) seen.add(new URL(r.url).pathname);
      }
      return urls.every((u) => seen.has(u));
    },
    urls,
    { timeout: 60000 },
  );
  await page.waitForFunction(
    async () => {
      const state = await fetch('/ngsw/state').then((r) => r.text());
      return state.includes('Driver state: NORMAL') && /Clients: [^\\n]+/.test(state);
    },
    null,
    { timeout: 60000 },
  );
  await page.reload();
  await page.locator('.quiz-mode').first().waitFor();
}
export async function seedHistory(page, count = 36) {
  return page.evaluate(async (count) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('letsple:quiz:history', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction(['answers', 'metadata'], 'readwrite'),
      store = tx.objectStore('answers');
    store.clear();
    const g = await new Promise((resolve) => {
      const r = tx.objectStore('metadata').get('generation');
      r.onsuccess = () => resolve(r.result);
    });
    for (let i = 0; i < count; i++) {
      const sessionId =
          '00000000-0000-4000-8000-' + String(Math.floor(i / 10) + 1).padStart(12, '0'),
        index = i % 10;
      const country = i % 3 === 0 ? 'FRA' : i % 3 === 1 ? 'JPN' : 'FJI',
        continent = country === 'FRA' ? 'Europe' : country === 'JPN' ? 'Asia' : 'Oceania',
        correct = i % 4 !== 0,
        mode = i % 2 ? 'cash' : 'carre',
        pointsPossible = mode === 'cash' ? 5 : 3;
      const event = {
        schemaVersion: 1,
        id: sessionId + ':' + index,
        sessionId,
        questionIndex: index,
        questionId: 'flag:' + country,
        questionType: 'flag',
        countryIso3: country,
        continent,
        mode,
        answerType: 'country',
        occurredAt: new Date(Date.now() - (i % 4) * 7 * 86400000).toISOString(),
        submittedAnswer: { id: correct ? country : 'DEU', label: correct ? 'Pays' : 'Allemagne' },
        acceptedAnswers: [{ id: country, label: 'Pays' }],
        correct,
        pointsAwarded: correct ? pointsPossible : 0,
        pointsPossible,
        corpusVersion: 'test-v1',
      };
      store.add({ id: event.id, event, generation: g, insertionSequence: i + 1 });
    }
    tx.objectStore('metadata').put(count + 1, 'nextSequence');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return count;
  }, count);
}
