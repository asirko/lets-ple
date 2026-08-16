/**
 * Ratio de contraste WCAG entre deux couleurs CSS calculées (format `getComputedStyle`).
 * Formule officielle : https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Parse une couleur au format `rgb(r, g, b)` ou `rgba(r, g, b, a)` — le format que renvoie
 * `getComputedStyle` dans tous les navigateurs. */
export function parseRgb(color: string): readonly [number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Couleur non reconnue : ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Ratio de contraste WCAG entre deux couleurs, de 1 (identiques) à 21 (noir/blanc). */
export function contrastRatio(colorA: string, colorB: string): number {
  const lumA = relativeLuminance(parseRgb(colorA));
  const lumB = relativeLuminance(parseRgb(colorB));
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}
