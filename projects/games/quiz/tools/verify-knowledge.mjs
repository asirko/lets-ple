import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {
  serveKnowledgeBuild,
  waitInstallation,
  seedHistory,
} from './knowledge-browser-helpers.mjs';
const server = await serveKnowledgeBuild();
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'allow',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [],
  external = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => {
  if (!r.url().startsWith(server.origin) && !r.url().startsWith('data:')) external.push(r.url());
});
await mkdir('tmp/knowledge-stats', { recursive: true });
try {
  await page.goto(server.origin + '/quiz');
  await page.locator('.quiz-mode').first().waitFor();
  await waitInstallation(page);
  // Product preload must not instantiate statistics or import Three.js.
  assert.equal(await page.locator('lp-knowledge-globe').count(), 0);
  await context.setOffline(true);
  await server.stop();
  await page.goto(server.origin + '/quiz/statistiques');
  await page.getByRole('heading', { name: 'Mes connaissances', exact: true }).waitFor();
  await page.getByText('Votre carte commence ici', { exact: true }).waitFor();
  await page.locator('canvas').waitFor({ timeout: 30000 });
  assert.equal(await page.locator('.quiz-stats-country').count(), 0);
  assert.equal(await page.locator('lp-country-picker option[value]:not([value=""])').count(), 195);
  assert(
    await page
      .locator('.quiz-stats-summary')
      .textContent()
      .then((t) => t.includes('N.A.')),
  );
  const emptyAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    emptyAxe.violations,
    [],
    JSON.stringify(
      emptyAxe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ),
  );
  await seedHistory(page);
  await page.reload();
  await page.locator('.quiz-stats-summary dd').first().waitFor();
  await page.waitForFunction(
    () => document.querySelector('.quiz-stats-summary dd')?.textContent === '36',
  );
  await page.getByLabel('Zone étudiée', { exact: true }).selectOption('Europe');
  await page.waitForFunction(
    () => document.querySelector('.quiz-stats-summary dd')?.textContent === '12',
  );
  const picker = page.getByLabel('Choisir un pays', { exact: true });
  await picker.focus();
  await picker.selectOption('FRA');
  const detail = page.getByRole('dialog', { name: 'France', exact: true });
  await detail.waitFor();
  assert.equal(await detail.locator('.quiz-stats-summary dd').first().textContent(), '12');
  const detailAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(detailAxe.violations, [], JSON.stringify(detailAxe.violations));
  await page.keyboard.press('Escape');
  await detail.waitFor({ state: 'detached' });
  assert(await picker.evaluate((el) => el === document.activeElement));
  // A previously dismissed country remains selectable, with one modal per selection.
  await picker.selectOption('FRA');
  await detail.waitFor();
  await page.keyboard.press('Escape');
  await detail.waitFor({ state: 'detached' });
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const mapRect = await canvas.boundingBox();
  await page.mouse.click(mapRect.x + mapRect.width / 2, mapRect.y + mapRect.height / 2);
  await detail.waitFor();
  await detail.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await detail.waitFor({ state: 'detached' });
  assert(await canvas.evaluate((el) => el === document.activeElement));
  await page.getByLabel('Zone étudiée', { exact: true }).selectOption('');
  assert.equal(
    await page.getByRole('button', { name: 'Liste accessible', exact: true }).count(),
    0,
  );
  const axe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    axe.violations,
    [],
    JSON.stringify(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
  );
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Effacer l’historique', exact: true }).click();
  await page.locator('dialog[open]').waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Annuler');
  await page.keyboard.press('Escape');
  await page.locator('dialog[open]').waitFor({ state: 'detached' });
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    'Effacer l’historique',
  );
  await page.screenshot({ path: resolve('tmp/knowledge-stats/stats-mobile.png'), fullPage: true });
  await page.locator('canvas').waitFor();
  await page.locator('canvas').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve('tmp/knowledge-stats/globe-mobile.png') });
  await page.locator('canvas').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  const rect = await page.locator('canvas').boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  assert.equal(await page.locator('.quiz-stats-globe button').count(), 0);
  const scrollBefore = await page.evaluate(() => scrollY);
  const labelsBefore = await page.locator('.quiz-stats-globe-surface').innerHTML();
  await page.mouse.wheel(0, -120);
  await page.waitForFunction(
    (before) => document.querySelector('.quiz-stats-globe-surface').innerHTML !== before,
    labelsBefore,
  );
  assert.equal(await page.evaluate(() => scrollY), scrollBefore);
  assert((await page.locator('.quiz-stats-globe .quiz-globe-label').count()) > 0);
  await page.evaluate(() =>
    document
      .querySelector('canvas')
      ?.getContext('webgl2')
      ?.getExtension('WEBGL_lose_context')
      ?.loseContext(),
  );
  await page
    .getByText(
      'Le globe est indisponible. Le sélecteur de pays donne accès aux mêmes statistiques.',
      {
        exact: true,
      },
    )
    .waitFor();
  assert.equal(await page.locator('.quiz-stats-country').count(), 0);
  assert.equal(await page.locator('lp-country-picker option[value]:not([value=""])').count(), 195);
  const other = await context.newPage();
  await other.goto(server.origin + '/quiz/statistiques');
  await other.waitForFunction(
    () => document.querySelector('.quiz-stats-summary dd')?.textContent === '36',
  );
  await page.getByRole('button', { name: 'Effacer l’historique', exact: true }).click();
  await page.getByRole('button', { name: 'Effacer définitivement', exact: true }).click();
  await other.waitForFunction(
    () => document.querySelector('.quiz-stats-summary dd')?.textContent === '0',
  );
  await other.close();
  await page.getByText('Votre carte commence ici', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('Votre carte commence ici', { exact: true }).waitFor();
  // Real answer flow, including the final answer, with the server still offline.
  await page.goto(server.origin + '/quiz');
  for (let i = 0; i < 10; i++) {
    await page.locator('.quiz-mode').last().click();
    await page.locator('.quiz-option').first().click();
    await page.locator('.quiz-correction lp-button button').click();
  }
  await page.locator('.quiz-result').waitFor();
  await page.goto(server.origin + '/quiz/statistiques');
  await page.waitForFunction(
    () => document.querySelector('.quiz-stats-summary dd')?.textContent === '10',
  );
  const actualEvents = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('letsple:quiz:history');
      r.onsuccess = () => resolve(r.result);
    });
    const rows = await new Promise((resolve) => {
      const r = db.transaction('answers').objectStore('answers').getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return rows.map((r) => r.event);
  });
  assert.equal(actualEvents.length, 10);
  assert.equal(actualEvents[9].questionIndex, 9);
  assert.equal(new Set(actualEvents.map((e) => e.sessionId)).size, 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  const report = {
    offline: true,
    realTenAnswerGame: true,
    unvisitedStatsRouteOffline: true,
    emptyAndPopulatedAxe: true,
    countryOptions: 195,
    countryModalFromMapAndPicker: true,
    countryNamesOnGlobe: true,
    noCountryListOrGlobeButtons: true,
    continentFocus: true,
    clearConfirmationAndFocus: true,
    crossTabClear: true,
    keyboardGlobeAndDefaultDesktopWheel: true,
    persistenceAfterReload: true,
    clearAfterReload: true,
    webglLossFallback: true,
    widths: [320, 360, 390],
    reducedMotion: true,
    pageErrors: errors,
    externalRequests: external,
    realMobilePerformance: 'not verified',
    real200PercentBrowserZoom: 'not verified',
    screenReader: 'not verified',
  };
  await writeFile('tmp/knowledge-stats/browser-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error('BROWSER ERRORS', errors);
  console.error('BODY', (await page.locator('body').textContent()).slice(0, 1000));
  await page.screenshot({ path: 'tmp/knowledge-stats/failure.png', fullPage: true });
  throw e;
} finally {
  await browser.close();
  if (server.server.listening) await server.stop();
}
