import type { KnowledgeLevel } from '../domain/knowledge-stats/knowledge-level';

/** Lit un token couleur résolu sur l'élément ; lève si le token est absent ou vide. */
export function readCssColor(token: string, element: Element = document.documentElement): string {
  const value = getComputedStyle(element).getPropertyValue(token).trim();
  if (!value) throw new Error(`Token CSS vide ou absent : ${token}`);
  return value;
}

/** Convertit `#rgb`, `#rrggbb`, `rgb(r, g, b)` ou `rgb(r g b / a)` en entier 0xRRGGBB. */
export function parseCssColor(value: string): number {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    return parseInt(digits, 16);
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map((n) => Math.round(Number(n)));
    return (r << 16) | (g << 8) | b;
  }
  throw new Error(`Couleur CSS non reconnue : ${value}`);
}

/** Même lecture que `readCssColor`, sous forme numérique pour Three.js. */
export function readCssColorNumber(token: string, element?: Element): number {
  return parseCssColor(readCssColor(token, element));
}

export function knowledgeColors(element?: Element): Record<KnowledgeLevel, number> {
  return {
    none: readCssColorNumber('--lp-knowledge-none', element),
    insufficient: readCssColorNumber('--lp-knowledge-insufficient', element),
    low: readCssColorNumber('--lp-knowledge-low', element),
    medium: readCssColorNumber('--lp-knowledge-medium', element),
    high: readCssColorNumber('--lp-knowledge-high', element),
  };
}

/** Appelle `onChange` quand le thème change (attribut, classe, style racine, préférence système). */
export function observeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class', 'style'],
  });
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', onChange);
  };
}
