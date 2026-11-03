/**
 * Génère les icônes PWA (PNG) et le favicon (ICO) du portail à partir des SVG statiques.
 *
 * Usage : `npm run icons`. Rastérise via Chromium (playwright) : le rendu du « pé » dépend des
 * polices système (Segoe UI), c'est le rendu voulu.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface IcoImage {
  size: number;
  png: Uint8Array;
}

/** Assemble un ICO dont chaque image est un PNG embarqué (taille 256 codée 0). */
export function packIco(images: readonly IcoImage[]): Uint8Array {
  const entetes = 6 + images.length * 16;
  const total = entetes + images.reduce((somme, image) => somme + image.png.length, 0);
  const sortie = new Uint8Array(total);
  const vue = new DataView(sortie.buffer);
  vue.setUint16(2, 1, true); // type : icône
  vue.setUint16(4, images.length, true);
  let offset = entetes;
  images.forEach((image, i) => {
    const entree = 6 + i * 16;
    const cote = image.size >= 256 ? 0 : image.size;
    sortie[entree] = cote;
    sortie[entree + 1] = cote;
    vue.setUint16(entree + 4, 1, true); // plans
    vue.setUint16(entree + 6, 32, true); // bits par pixel
    vue.setUint32(entree + 8, image.png.length, true);
    vue.setUint32(entree + 12, offset, true);
    sortie.set(image.png, offset);
    offset += image.png.length;
  });
  return sortie;
}

/**
 * Frame 16 px du favicon : le « pé » y est illisible (accent noyé dans le flou), on ne garde
 * que la pastille et le « p », agrandis, sur fond transparent.
 */
const FAVICON_16_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="32" fill="#5865d8" />
  <text x="32" y="48" text-anchor="middle" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="46" font-weight="700" fill="#ffffff">p</text>
</svg>`;

async function main(): Promise<void> {
  const { chromium } = await import('playwright');
  const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const publicDir = join(racine, 'projects/apps/portal/public');
  const iconsDir = join(publicDir, 'icons');
  mkdirSync(iconsDir, { recursive: true });

  const lireSvg = (fichier: string): string => readFileSync(join(iconsDir, fichier), 'utf8');

  const navigateur = await chromium.launch();
  const page = await navigateur.newPage();

  const rasteriser = async (svg: string, taille: number): Promise<Buffer> => {
    await page.setViewportSize({ width: taille, height: taille });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${taille}px;height:${taille}px}</style>${svg}`,
    );
    return page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: taille, height: taille },
    });
  };

  for (const taille of [180, 192, 512]) {
    writeFileSync(
      join(iconsDir, `icon-${taille}.png`),
      await rasteriser(lireSvg('icon.svg'), taille),
    );
  }
  for (const taille of [192, 512]) {
    writeFileSync(
      join(iconsDir, `icon-maskable-${taille}.png`),
      await rasteriser(lireSvg('icon-maskable.svg'), taille),
    );
  }
  const frames: IcoImage[] = [];
  for (const size of [16, 32, 48]) {
    const svg = size === 16 ? FAVICON_16_SVG : lireSvg('icon.svg');
    frames.push({ size, png: await rasteriser(svg, size) });
  }
  writeFileSync(join(publicDir, 'favicon.ico'), packIco(frames));

  await navigateur.close();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  });
}
