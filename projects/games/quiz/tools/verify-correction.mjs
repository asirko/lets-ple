import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
const root = resolve('dist/portal/browser');
const mime = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (path !== root && !path.startsWith(root + sep)) throw Error('outside root');
    let data;
    try {
      data = await readFile(path);
    } catch {
      if (extname(path)) throw Error('missing asset');
      path = resolve(root, 'index.html');
      data = await readFile(path);
    }
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = process.env.QUIZ_PREVIEW_URL || `http://127.0.0.1:${server.address().port}`;
const countries = JSON.parse(await readFile('content/geography/countries.json', 'utf8'));
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const output = resolve('tmp/quiz-correction-verification');
await mkdir(output, { recursive: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
  serviceWorkers: 'block',
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') console.error('Console:', msg.text());
});
const screenshot = async (name) => page.screenshot({ path: resolve(output, name + '.png') });
async function openShowcase(
  code = 'FRA',
  last = false,
  outcome = 'Bonne réponse',
  staticOnly = false,
) {
  await page.goto(origin + '/dev/components/quiz-correction');
  await page.getByLabel('countryCode').selectOption(code);
  await page.getByLabel('outcome').selectOption(outcome);
  await page.getByLabel('lastQuestion').setChecked(last);
  await page.getByLabel('staticOnly').setChecked(staticOnly);
  await page.getByRole('button', { name: 'Afficher la correction', exact: true }).click();
  await page.getByRole('dialog').waitFor();
}
async function checkFocus() {
  assert.equal(await page.locator('dialog[open]').evaluate((el) => el.matches(':modal')), true);
  assert.equal(
    await page.evaluate(() => document.activeElement.closest('.dialog-actions') !== null),
    true,
  );
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog')), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await page.evaluate(() => !!document.activeElement.closest('.dialog-actions')),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').evaluate((el) => el.open), true);
  await page.evaluate(() =>
    document
      .querySelector('main button, .quiz-toolbar-trigger, .dev-showcase-controls select')
      ?.focus(),
  );
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog')), true);
}
async function checkLayout() {
  const metrics = await page.locator('dialog[open]').evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    viewport: innerWidth,
    overflow: el.scrollWidth > el.clientWidth + 1,
    bodyOverflow:
      el.querySelector('.dialog-body').scrollWidth >
      el.querySelector('.dialog-body').clientWidth + 1,
    action: el.querySelector('.dialog-actions button').getBoundingClientRect().bottom,
    height: innerHeight,
  }));
  assert.ok(
    metrics.width <= metrics.viewport && !metrics.overflow && !metrics.bodyOverflow,
    JSON.stringify(metrics),
  );
  assert.ok(metrics.action <= metrics.height, JSON.stringify(metrics));
  for (const b of await page.locator('.quiz-globe-controls button').all()) {
    const box = await b.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, `Touch target ${JSON.stringify(box)}`);
  }
  assert.equal(
    await page
      .locator('.quiz-correction .dialog-surface')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none',
  );
}

async function checkContrast() {
  // Theme transitions must finish before measuring their final AA contrast.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  const values = await page.locator('.quiz-correction').evaluate((host) => {
    const selectors = [
      '.dialog-title',
      '.quiz-correction-caption',
      '.quiz-correction-answer',
      '.dialog-actions button',
      '.quiz-globe-label',
    ];
    const styles = getComputedStyle(host);
    const selectedContrast = {
      selector: 'selected.answer',
      fg: styles.getPropertyValue('--lp-color-primary-contrast').trim(),
      bg: styles.getPropertyValue('--lp-color-primary').trim(),
    };
    return selectors
      .map((selector) => {
        const el = host.querySelector(selector);
        if (!el) return null;
        let bg = 'rgba(0, 0, 0, 0)';
        for (let p = el; p; p = p.parentElement) {
          const c = getComputedStyle(p).backgroundColor;
          if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
            bg = c;
            break;
          }
        }
        return { selector, fg: getComputedStyle(el).color, bg };
      })
      .filter(Boolean)
      .concat(selectedContrast);
  });
  const luminance = (css) => {
    const channels = (
      css.startsWith('#')
        ? 'rgb(' + [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16)).join(',') + ')'
        : css
    )
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((c) => {
        c /= 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const { selector, fg, bg } of values) {
    const a = luminance(fg),
      b = luminance(bg),
      ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      minimum = selector.includes('title') || selector.includes('answer') ? 3 : 4.5;
    assert.ok(ratio >= minimum, selector + ': ' + ratio);
  }
}

async function checkGlobe(code) {
  await page.locator('.quiz-globe-canvas').waitFor();
  const selected = page.locator('.quiz-globe-label.is-selected');
  await selected.waitFor();
  assert.equal(await selected.innerText(), countries.find((c) => c.iso3 === code).name);
  const centered = () =>
    page.waitForFunction(() => {
      const el = document.querySelector('.quiz-globe-label.is-selected');
      const host = el?.parentElement;
      return (
        el &&
        Math.abs(parseFloat(el.style.left) - host.clientWidth / 2) < 2 &&
        Math.abs(parseFloat(el.style.top) - host.clientHeight / 2) < 2
      );
    });
  await centered();
  assert.equal(await page.locator('.quiz-globe-controls button').count(), 2);
  assert.equal(await page.locator('.quiz-globe-names').count(), 0);
  const recenter = page.getByRole('button', { name: 'Recentrer sur la solution', exact: true });
  const help = page.getByRole('button', { name: 'Comment manipuler le globe', exact: true });
  await help.focus();
  await page.getByRole('tooltip').waitFor();
  assert.ok((await page.getByRole('tooltip').innerText()).includes('Glissez pour tourner'));
  await help.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  await page.getByRole('tooltip').waitFor({ state: 'hidden' });
  await help.click();
  await page.getByRole('tooltip').waitFor();
  await recenter.press('Enter');
  await page.getByRole('tooltip').waitFor({ state: 'hidden' });
  await page.mouse.move(0, 0);
  const helpBounds = await help.boundingBox();
  await page.mouse.move(helpBounds.x + helpBounds.width / 2, helpBounds.y + helpBounds.height / 2);
  await page.getByRole('tooltip').waitFor();
  const tooltipBounds = await page.getByRole('tooltip').boundingBox();
  await page.mouse.move(
    helpBounds.x + helpBounds.width / 2,
    tooltipBounds.y + tooltipBounds.height - 5,
    { steps: 15 },
  );
  assert.equal(await page.getByRole('tooltip').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.getByRole('tooltip').waitFor({ state: 'hidden' });
  const bounds = await page.locator('canvas').boundingBox();
  const x = bounds.x + bounds.width / 2,
    y = bounds.y + bounds.height / 2;
  const initial = await selected.evaluate((el) => parseFloat(el.style.left));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 45, y, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction((before) => {
    const el = document.querySelector('.quiz-globe-label.is-selected');
    return !el || Math.abs(parseFloat(el.style.left) - before) > 2;
  }, initial);
  await recenter.press('Enter');
  await centered();
  if (code === 'FRA') {
    const neighbor = await page.locator('.quiz-globe-viewport').evaluate(
      (host) =>
        Array.from(host.querySelectorAll('.quiz-globe-label:not(.is-selected)'))
          .map((el) => ({
            name: el.textContent,
            distance: Math.hypot(
              parseFloat(el.style.left) - host.clientWidth / 2,
              parseFloat(el.style.top) - host.clientHeight / 2,
            ),
          }))
          .filter((x) => x.distance > 20)
          .sort((a, b) => a.distance - b.distance)[0],
    );
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -300);
    await page.waitForFunction((before) => {
      const host = document.querySelector('.quiz-globe-viewport');
      const el = Array.from(host.querySelectorAll('.quiz-globe-label')).find(
        (el) => el.textContent === before.name,
      );
      return (
        el &&
        Math.hypot(
          parseFloat(el.style.left) - host.clientWidth / 2,
          parseFloat(el.style.top) - host.clientHeight / 2,
        ) >
          before.distance + 1
      );
    }, neighbor);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction((before) => {
      const host = document.querySelector('.quiz-globe-viewport');
      const el = Array.from(host.querySelectorAll('.quiz-globe-label')).find(
        (el) => el.textContent === before.name,
      );
      return (
        el &&
        Math.abs(
          Math.hypot(
            parseFloat(el.style.left) - host.clientWidth / 2,
            parseFloat(el.style.top) - host.clientHeight / 2,
          ) - before.distance,
        ) < 1
      );
    }, neighbor);
    await recenter.click();
    await centered();
  }
}

try {
  await openShowcase();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await checkFocus();
  await checkGlobe('FRA');
  await checkLayout();
  await checkContrast();
  await screenshot('france-dark-mobile');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await checkContrast();
  await screenshot('france-light-mobile');
  await page.setViewportSize({ width: 320, height: 700 });
  await checkLayout();
  await screenshot('france-320');
  const closedContext = await page
    .locator('canvas')
    .evaluateHandle((el) => el.getContext('webgl2'));
  await page.getByRole('button', { name: 'Question suivante', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await closedContext.evaluate((context) => context.isContextLost()), true);
  await closedContext.dispose();
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    'Afficher la correction',
  );
  for (const code of ['FJI', 'VAT', 'ZAF']) {
    await openShowcase(code, false, 'Mauvaise réponse');
    await checkGlobe(code);
    await checkLayout();
    await screenshot(code.toLowerCase());
  }
  await openShowcase('ZAF', true);
  assert.ok((await page.locator('.quiz-correction-answer').innerText()).includes('Pretoria'));
  assert.ok((await page.locator('.quiz-country-info').innerText()).includes('Bloemfontein'));
  await page.getByRole('button', { name: 'Voir le résultat', exact: true }).click();
  await openShowcase('NRU', false, 'Bonne réponse', true);
  assert.ok((await page.locator('.quiz-country-info').innerText()).includes('Villes de référence'));
  await screenshot('nauru-static');
  await openShowcase();
  await page.locator('canvas').waitFor();
  await page
    .locator('canvas')
    .evaluate((el) => el.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator('.quiz-globe-viewport svg').waitFor();
  assert.equal(await page.locator('canvas').count(), 0);
  await screenshot('context-loss-fallback');
  const categories = new Set();
  let correct = 0,
    wrong = 0;
  await page.goto(origin + '/quiz');
  for (let round = 0; round < 10; round++) {
    await page.locator('.quiz-mode').first().waitFor();
    assert.equal(await page.locator('lp-quiz-correction').count(), 0);
    assert.equal(await page.locator('lp-country-globe').count(), 0);
    const type = (await page.locator('.quiz-eyebrow').textContent()).trim(),
      prompt = await page.locator('.quiz-question h2').innerText();
    categories.add(type);
    let country = null;
    if (type === 'Drapeaux') {
      const src = await page.locator('.quiz-flag').getAttribute('src');
      country = countries.find((c) => c.flag === src);
      assert.equal(await page.locator('.quiz-flag').getAttribute('alt'), 'Drapeau à identifier');
    }
    if (type === 'Capitales')
      country = [...countries]
        .sort((a, b) => b.name.length - a.name.length)
        .find((c) => prompt.includes(c.name));
    if (type === 'Pays')
      country = countries.find((c) => c.capitals.some((cap) => prompt.includes(cap)));
    if (type === 'Frontières') {
      const names = await page.locator('.quiz-neighbors li').allTextContents();
      const codes = names.map((n) => countries.find((c) => c.name === n).iso3);
      country = countries.find((c) => codes.every((code) => c.borders.includes(code)));
    }
    await page.getByRole('button', { name: /^Carré/i }).click();
    await page.locator('.quiz-option').first().waitFor();
    const options = await page.locator('.quiz-option').allTextContents();
    const labels = options.map((t) => t.trim().slice(1).trim());
    const matching = country
      ? labels.findIndex((l) =>
          type === 'Capitales' ? country.capitals.includes(l) : l === country.name,
        )
      : -1;
    const index = round % 2 === 0 && matching >= 0 ? matching : matching === 0 ? 1 : 0;
    const submitted = labels[index];
    await page.locator('.quiz-option').nth(index).click();
    await page.getByRole('dialog').waitFor();
    await checkFocus();
    const text = await page.locator('.quiz-correction .dialog-title').innerText();
    if (text.includes('Bonne réponse')) correct++;
    else wrong++;
    assert.equal(
      (await page.locator('.quiz-correction-facts strong').first().textContent())
        .trim()
        .replace(/\s+/g, ' '),
      submitted.replace(/\s+/g, ' '),
    );
    assert.ok(!(await page.locator('.quiz-country-info').innerText()).includes('quiz.region.'));
    if (country)
      assert.equal(await page.locator('.quiz-country-heading h3').innerText(), country.name);
    await page
      .getByRole('button', {
        name: round === 9 ? 'Voir le résultat' : 'Question suivante',
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () => !!document.activeElement.closest('.quiz-question,.quiz-result'),
    );
  }
  assert.equal(categories.size, 5);
  assert.ok(correct > 0 && wrong > 0, `correct=${correct}, wrong=${wrong}`);
  await page.locator('.quiz-result').waitFor();
  assert.ok((await page.locator('.quiz-result').innerText()).includes('Bonnes réponses'));
  await screenshot('result');
  // 1280×1000 at 200% browser zoom has the same 640×500 CSS viewport.
  await page.setViewportSize({ width: 640, height: 500 });
  await openShowcase();
  await page.locator('canvas').waitFor();
  await checkLayout();
  await screenshot('zoom-200-reflow');
  await page.goto(origin + '/');
  assert.equal(await page.locator('lp-country-globe, .quiz-globe-canvas').count(), 0);
  for (const unavailable of ['webgl', '2d']) {
    const disabled = await browser.newContext({
      viewport: { width: 320, height: 700 },
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    await disabled.addInitScript((unavailable) => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === 'webgl' || type === 'webgl2')
          window.__quizGlAttempts = (window.__quizGlAttempts || 0) + 1;
        if (unavailable === '2d' ? type === '2d' : type === 'webgl' || type === 'webgl2')
          return null;
        const result = original.call(this, type, ...args);
        if (type === 'webgl' || type === 'webgl2') window.__quizGpu = result;
        return result;
      };
    }, unavailable);
    const fallback = await disabled.newPage();
    await fallback.goto(origin + '/dev/components/quiz-correction');
    await fallback.getByRole('button', { name: 'Afficher la correction', exact: true }).click();
    // Wait for initialization to fail, rather than accepting the pre-import SVG.
    await fallback.waitForFunction(
      (kind) => (kind === '2d' ? window.__quizGpu?.isContextLost() : window.__quizGlAttempts > 0),
      unavailable,
    );
    await fallback.locator('.quiz-globe-viewport svg').waitFor();
    assert.equal(await fallback.locator('canvas').count(), 0);
    await fallback.getByRole('button', { name: 'Question suivante', exact: true }).click();
    await disabled.close();
  }
  const touch = await browser.newContext({
    viewport: { width: 320, height: 700 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const touchPage = await touch.newPage();
  await touchPage.goto(origin + '/dev/components/quiz-correction');
  await touchPage.getByRole('button', { name: 'Afficher la correction', exact: true }).tap();
  await touchPage.locator('canvas').waitFor();
  await touchPage.getByRole('button', { name: 'Comment manipuler le globe', exact: true }).tap();
  await touchPage.getByRole('tooltip').waitFor();
  await touchPage.getByRole('button', { name: 'Recentrer sur la solution', exact: true }).tap();
  await touchPage.getByRole('tooltip').waitFor({ state: 'hidden' });
  await touch.close();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: 'PASS',
        categories: [...categories],
        correct,
        wrong,
        checks: [
          '3D centering',
          'rotation/zoom/recenter',
          'modal/inert/focus/trap/Escape',
          '320px',
          '200% equivalent reflow (640x500 CSS px)',
          'pointer orbit/zoom, keyboard recenter and help tooltip',
          'reduced-motion',
          'context-loss',
          'GPU context released on close',
          'WebGL/2D canvas unavailable',
          'capital/flag/silhouette/neighbors',
          'last question',
        ],
        screenshots: output,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error('Browser diagnostics', await page.locator('body').innerText(), errors);
  throw error;
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
