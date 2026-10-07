import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

// Run after `npm run build`. Real service worker, fresh browser profile, no mocked responses.
const root = resolve('dist/portal/browser');
const manifest = JSON.parse(await readFile(resolve(root, 'ngsw.json'), 'utf8'));
const geographyUrls = manifest.assetGroups.find((group) => group.name === 'quiz-geography').urls;
const mime = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  try {
    let path = resolve(
      root,
      '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
    );
    if (!path.startsWith(root + sep)) throw new Error('outside root');
    try {
      if (!(await stat(path)).isFile()) throw new Error('directory');
    } catch {
      if (extname(path)) {
        res.writeHead(404).end();
        return;
      }
      path = resolve(root, 'index.html');
    }
    res.writeHead(200, {
      'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin + '/quiz');
  await page.locator('.quiz-question h2').waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 60000,
  });
  // Wait for the geography group to finish installation before disconnecting.
  await page.waitForFunction(
    async (urls) => {
      const names = await caches.keys();
      const geography = names.find((name) => name.includes('quiz-geography:cache'));
      if (!geography) return false;
      const cached = new Set(
        (await (await caches.open(geography)).keys()).map(
          (request) => new URL(request.url).pathname,
        ),
      );
      return urls.every((url) => cached.has(url));
    },
    geographyUrls,
    { timeout: 60000 },
  );
  await page.reload();
  await page.locator('.quiz-question h2').waitFor();
  await context.setOffline(true);
  // Stopping the server also proves independence from both browser emulation and HTTP cache.
  await new Promise((done) => server.close(done));
  await page.reload();
  try {
    await page.locator('.quiz-question h2').waitFor();
  } catch (error) {
    console.error(
      'Offline diagnostics',
      await page.locator('body').innerText(),
      errors,
      await page.evaluate(async () => ({
        caches: await caches.keys(),
        sw: await (await fetch('/ngsw/state')).text(),
      })),
    );
    throw error;
  }
  assert.equal(
    await page.evaluate(async () => {
      try {
        return (await fetch('/uncached-offline-probe?ngsw-bypass=true')).ok;
      } catch {
        return false;
      }
    }),
    false,
  );
  const categories = new Set();
  for (let round = 0; round < 10; round++) {
    await page.locator('.quiz-mode').first().waitFor();
    assert.equal(await page.locator('.quiz-mode').count(), 2);
    const category = (await page.locator('.quiz-eyebrow').textContent()).trim();
    categories.add(category);
    if (category === 'Drapeaux') {
      await page.waitForFunction(() => document.querySelector('.quiz-flag')?.naturalWidth > 0);
    }
    if (category === 'Silhouettes')
      assert.ok(
        (await page.locator('.quiz-question svg[role="img"] path').first().getAttribute('d'))
          .length > 100,
      );
    if (round % 2 === 0) {
      await page.getByRole('button', { name: /^Cash/i }).click();
      const field = page.getByRole('combobox');
      await field.fill(category === 'Capitales' ? 'Paris' : 'France');
      await field.press('ArrowDown');
      await field.press('Enter');
      await page.getByRole('button', { name: 'Valider ma réponse', exact: true }).click();
    } else {
      await page.getByRole('button', { name: /^Carré/i }).click();
      await page.locator('.quiz-option').first().waitFor();
      assert.equal(await page.locator('.quiz-option').count(), 4);
      const neighbors = await page.locator('.quiz-neighbors li').allTextContents();
      for (const label of await page.locator('.quiz-option').allTextContents()) {
        assert.ok(!neighbors.some((neighbor) => label.trim().slice(1).trim() === neighbor.trim()));
      }
      await page.locator('.quiz-option').first().click();
    }
    await page.locator('.quiz-feedback').waitFor();
    await page
      .getByRole('button', {
        name: round === 9 ? 'Voir le résultat' : 'Question suivante',
        exact: true,
      })
      .click();
  }
  assert.equal(categories.size, 5);
  await page.locator('lp-quiz-result').waitFor();
  const openSettings = async () => {
    await page.getByLabel('Menu du quiz', { exact: true }).click();
    await page.getByRole('button', { name: 'Paramètres du quiz', exact: true }).click();
    await page.getByRole('dialog').waitFor();
  };
  await openSettings();
  const boxes = page.getByRole('checkbox');
  assert.equal(await boxes.count(), 5);
  for (const box of await boxes.all()) {
    assert.equal(await box.isChecked(), true);
    await box.uncheck();
  }
  await page.locator('dialog button:disabled').waitFor();
  await page.getByLabel('Reconnaître le pays par ses contours', { exact: true }).check();
  await mkdir('tmp/quiz-verification', { recursive: true });
  await page.screenshot({ path: 'tmp/quiz-verification/settings-mobile.png' });
  await page.getByRole('button', { name: 'Enregistrer et jouer' }).click();
  await page.locator('.quiz-question svg[role="img"]').waitFor();
  await page.reload();
  await page.locator('.quiz-question svg[role="img"]').waitFor();
  await openSettings();
  assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 1);
  await page.getByLabel('Reconnaître le pays par son drapeau', { exact: true }).check();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await openSettings();
  assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 1);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(
    await page
      .getByLabel('Menu du quiz', { exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.setViewportSize({ width: 320, height: 740 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'tmp/quiz-verification/silhouette-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        offline: true,
        rounds: 10,
        categories: [...categories],
        modes: ['cash', 'carre'],
        settingsRestored: true,
        cancelPreservesSettings: true,
        emptySelectionBlocked: true,
        keyboardFocusRestored: true,
        mobileOverflow: false,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  if (server.listening) await new Promise((done) => server.close(done));
}
