import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { Country } from '../src/lib/domain/types';
import { approvedComposition, reviewComposition } from '../src/lib/domain/silhouette-composition';

it.each(['MUS', 'NOR', 'PLW', 'NLD', 'TUV', 'TON', 'SYC', 'NZL'])(
  'active la composition validée de %s dans le quiz',
  (code) => {
    const country = countries.find((c) => c.iso3 === code)!;
    expect(approvedComposition(country)).toEqual(reviewComposition(country));
  },
);
it.each(['MHL'])('ne fournit aucune composition approuvée pour %s', (code) => {
  expect(approvedComposition(countries.find((c) => c.iso3 === code)!)).toBeNull();
});

const countries = JSON.parse(readFileSync('content/geography/countries.json', 'utf8')) as Country[];
it('place les encadrés des Seychelles à droite ou en bas', () => {
  const { boxes } = reviewComposition(countries.find((c) => c.iso3 === 'SYC')!)!;
  const main = boxes[0];
  for (const inset of boxes.slice(1)) {
    expect(inset.x >= main.x + main.width || inset.y >= main.y + main.height).toBe(true);
  }
});
it('zoome la Nouvelle-Zélande sans couper les contours du groupe principal', () => {
  const main = reviewComposition(countries.find((c) => c.iso3 === 'NZL')!)!.boxes[0];
  const [x, y, w, h] = main.viewBox!.split(' ').map(Number);
  expect(w * h).toBeLessThan(480 * 300);
  expect([main.x, main.y, main.width, main.height]).toEqual([0, 0, 430, 560]);
  for (const p of main.path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)) {
    expect(+p[1]).toBeGreaterThan(x);
    expect(+p[1]).toBeLessThan(x + w);
    expect(+p[2]).toBeGreaterThan(y);
    expect(+p[2]).toBeLessThan(y + h);
  }
});
it.each(['MUS', 'TUV', 'TON', 'NOR', 'NZL', 'PLW', 'NLD', 'SYC'])(
  'compose %s sans perte, duplication ni chevauchement',
  (code) => {
    const country = countries.find((c) => c.iso3 === code)!;
    const result = reviewComposition(country)!;
    const geometry = country.geometry!;
    const count = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
    expect(result.boxes.flatMap((b) => b.indices).sort((a, b) => a - b)).toEqual(
      Array.from({ length: count }, (_, i) => i + 1),
    );
    const [, , width, height] = result.viewBox.split(' ').map(Number);
    for (const [i, a] of result.boxes.entries()) {
      expect(a.path).not.toMatch(/NaN|Infinity/);
      expect(a.x + a.width).toBeLessThanOrEqual(width);
      expect(a.y + a.height).toBeLessThanOrEqual(height);
      for (const b of result.boxes.slice(i + 1)) {
        expect(
          a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ).toBe(false);
      }
    }
  },
);

it('garde les deux grandes îles néo-zélandaises dans la vue principale', () => {
  const result = reviewComposition(countries.find((c) => c.iso3 === 'NZL')!)!;
  expect(result.boxes[0].indices).toEqual(
    Array.from({ length: 26 }, (_, i) => i + 1).filter((i) => i !== 8 && i !== 9),
  );
  expect(result.boxes).toHaveLength(3);
  expect(result.boxes.slice(1).every((b) => b.x > result.boxes[0].width)).toBe(true);
  expect(
    result.boxes
      .slice(1)
      .flatMap((b) => b.indices)
      .sort((a, b) => a - b),
  ).toEqual([8, 9]);
});

it('ne propose pas de composition pour les pays non demandés', () => {
  expect(reviewComposition(countries.find((c) => c.iso3 === 'MHL')!)).toBeNull();
});
