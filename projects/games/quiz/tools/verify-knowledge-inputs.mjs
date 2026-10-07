import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { serveKnowledgeBuild } from './knowledge-browser-helpers.mjs';
const server = await serveKnowledgeBuild();
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
await mkdir('tmp/knowledge-stats', { recursive: true });
try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(server.origin + '/dev/components/quiz-country-picker');
  const picker = page.getByLabel('Choisir un pays', { exact: true });
  await picker.waitFor();
  await picker.selectOption('FRA');
  assert.equal(await picker.inputValue(), 'FRA');
  await page.goto(server.origin + '/dev/components/quiz-country-detail');
  const open = page.getByRole('button', { name: 'Voir les statistiques de France', exact: true });
  await open.click();
  await page.getByRole('dialog', { name: 'France', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  assert(await open.evaluate((el) => el === document.activeElement));
  await open.click();
  await page.getByRole('dialog', { name: 'France', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.goto(server.origin + '/quiz/statistiques');
  await page.locator('.quiz-globe-label').first().waitFor();
  await page.screenshot({ path: 'tmp/knowledge-stats/stats-desktop.png', fullPage: true });
  await page.getByLabel('Choisir un pays', { exact: true }).selectOption('FRA');
  const detail = page.getByRole('dialog', { name: 'France', exact: true });
  await detail.waitFor();
  await page.screenshot({ path: 'tmp/knowledge-stats/country-modal.png' });
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
  await desktop.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  const touch = await mobile.newPage();
  touch.on('pageerror', (e) => errors.push(String(e)));
  await touch.goto(server.origin + '/quiz/statistiques');
  const surface = touch.locator('.quiz-stats-globe-surface');
  const canvas = touch.locator('canvas');
  await canvas.waitFor();
  await touch.locator('.quiz-globe-label').first().waitFor();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await touch.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const passiveBefore = await touch.evaluate(() => scrollY);
  await touch.mouse.wheel(0, 120);
  await touch.waitForFunction((before) => scrollY > before, passiveBefore);
  await touch.getByRole('button', { name: 'Activer les gestes tactiles', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  const activeBox = await canvas.boundingBox();
  const scrollBefore = await touch.evaluate(() => scrollY);
  const before = await surface.innerHTML();
  const session = await mobile.newCDPSession(touch);
  const x = activeBox.x + activeBox.width / 2,
    y = activeBox.y + activeBox.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + i * 8, y }],
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.waitForFunction(
    (before) => document.querySelector('.quiz-stats-globe-surface').innerHTML !== before,
    before,
  );
  assert.equal(await touch.evaluate(() => scrollY), scrollBefore);
  assert.equal(await touch.locator('dialog[open]').count(), 0);
  assert.equal(await touch.locator('.quiz-stats-globe button').count(), 0);
  await touch.screenshot({ path: 'tmp/knowledge-stats/stats-touch.png', fullPage: true });
  assert.deepEqual(errors, []);
  await touch.getByLabel('Choisir un pays', { exact: true }).selectOption('COD');
  const smallDialog = touch.getByRole('dialog', {
    name: 'République démocratique du Congo',
    exact: true,
  });
  await smallDialog.waitFor();
  for (const width of [320, 360, 390, 640]) {
    await touch.setViewportSize({ width, height: 844 });
    assert(
      await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `modal overflow at ${width}`,
    );
  }
  await touch.keyboard.press('Escape');
  console.log(
    JSON.stringify(
      {
        countryPickerShowcase: true,
        reopenableCountryDialogShowcase: true,
        mobilePassiveScroll: true,
        activatedTouchRotation: true,
        noGlobeButtons: true,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.stop();
}
