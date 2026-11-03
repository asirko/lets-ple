/**
 * Outils purs du garde-fou de design : détection de couleurs et longueurs en dur, lecture des
 * blocs de thème de `tokens.scss`, calcul de contraste WCAG et parcours de fichiers.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Retire les commentaires `/* … *\/` et `// …` (sans toucher aux `://` des URL). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const COLOR_PATTERN =
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-z])|\b0x[0-9a-f]{6}\b|\b(?:rgba?|hsla?)\(\s*[\d.][^()]*\)/gi;

/** Couleurs littérales (hex, 0x, rgb/rgba/hsl à arguments numériques), commentaires ignorés. */
export function findLiteralColors(source: string): string[] {
  return stripComments(source).match(COLOR_PATTERN) ?? [];
}

const LENGTH_PATTERN = /(?<![\w.])(\d*\.?\d+)(px|rem|em)\b/g;
const ALLOWED_LENGTHS = new Set(['0', '1px', '2px']);

/** Longueurs px/rem/em hors déclarations `--x: …`, conditions `@media` (points de rupture) et valeurs 0, 1px, 2px. */
export function findLengthLiterals(source: string): string[] {
  const withoutCustomProps = stripComments(source)
    .replace(/@media[^{]*/g, '')
    .replace(/--[\w-]+\s*:[^;\n]*;?/g, '');
  const found: string[] = [];
  for (const match of withoutCustomProps.matchAll(LENGTH_PATTERN)) {
    const value = match[0];
    if (Number(match[1]) === 0 || ALLOWED_LENGTHS.has(value)) continue;
    found.push(value);
  }
  return found;
}

/** Propriétés personnalisées dont la déclaration se référence via `var(--même-nom` (invalide à l'exécution). */
export function findSelfReferencingProperties(source: string): string[] {
  const found: string[] = [];
  for (const match of stripComments(source).matchAll(/(--[\w-]+)\s*:([^;\n]*);?/g)) {
    if (new RegExp(String.raw`var\(\s*${match[1]}(?![\w-])`).test(match[2])) found.push(match[1]);
  }
  return found;
}

type ThemeBlocks = Record<'light' | 'darkMedia' | 'darkAttr', Record<string, string>>;

/** Contenu du bloc `{ … }` dont l'accolade ouvrante suit `headerEnd` (accolades imbriquées gérées). */
function blockBody(scss: string, headerEnd: number): string {
  const open = scss.indexOf('{', headerEnd);
  let depth = 0;
  for (let i = open; i < scss.length; i++) {
    if (scss[i] === '{') depth++;
    else if (scss[i] === '}' && --depth === 0) return scss.slice(open + 1, i);
  }
  return '';
}

function readVariables(body: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const match of body.matchAll(/(--lp-[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function afterHeader(scss: string, header: RegExp, from = 0): number {
  const match = header.exec(scss.slice(from));
  return match ? from + match.index + match[0].length : -1;
}

/** Variables `--lp-*` des trois blocs de couleurs de `tokens.scss` (le premier `:root` est ignoré). */
export function parseThemeBlocks(scss: string): ThemeBlocks {
  const read = (header: RegExp, from = 0): Record<string, string> => {
    const end = afterHeader(scss, header, from);
    return end < 0 ? {} : readVariables(blockBody(scss, end));
  };
  const media = afterHeader(scss, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  return {
    light: read(/:root,\s*:root\[data-theme='light'\]/),
    darkMedia: media < 0 ? {} : read(/:root:not\(\[data-theme='light'\]\)/, media),
    darkAttr: read(/:root\[data-theme='dark'\]/),
  };
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG 2.x entre deux couleurs `#rrggbb`. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Fichiers d'extensions données, récursivement, hors `*.spec.ts` et `node_modules`. */
export function listFiles(dir: string, extensions: readonly string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') files.push(...listFiles(path, extensions));
    } else if (!entry.name.endsWith('.spec.ts') && extensions.some((e) => entry.name.endsWith(e))) {
      files.push(path);
    }
  }
  return files;
}
