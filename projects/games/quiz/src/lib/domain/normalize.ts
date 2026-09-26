/** Punctuation and spaces do not change a name; spelling mistakes still do. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[\s'’ʼ\-‐‑–.]/gu, '');
}
