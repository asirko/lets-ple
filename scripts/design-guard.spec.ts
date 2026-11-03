import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  findLengthLiterals,
  findLiteralColors,
  findSelfReferencingProperties,
  listFiles,
  parseThemeBlocks,
} from './design-guard';

// Échantillon minimal des trois blocs de couleurs (le bloc :root typographie ne doit pas être lu).
const SAMPLE_TOKENS = `
:root {
  --lp-font-size-base: 1rem;
  --lp-color-text: #000000;
}

// Thème clair
:root,
:root[data-theme='light'] {
  --lp-color-text: #14151a;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --lp-color-text: #f7f8f8;
    --lp-color-dialog-backdrop: rgb(0 0 0 / 72%);
  }
}

:root[data-theme='dark'] {
  --lp-color-text: #f7f8f8;
}
`;

describe('design-guard', () => {
  it('repère les couleurs littérales', () => {
    expect(findLiteralColors('a{color:#fff;b:rgb(0 0 0 / 50%)} // #123456')).toEqual([
      '#fff',
      'rgb(0 0 0 / 50%)',
    ]);
    expect(findLiteralColors('new Color(0x122237)')).toEqual(['0x122237']);
    expect(findLiteralColors('color: var(--lp-color-text)')).toEqual([]);
    expect(findLiteralColors('/* #abcdef */ x: #AbCdEf80')).toEqual(['#AbCdEf80']);
  });

  it('repère les longueurs en dur hors propriétés personnalisées', () => {
    expect(
      findLengthLiterals('gap: 12px; border: 1px solid; --quiz-max: 34rem;\nwidth: 2.75rem;'),
    ).toEqual(['12px', '2.75rem']);
  });

  it('ignore les points de rupture des @media', () => {
    expect(findLengthLiterals('@media (min-width: 600px) {\n  a { gap: 12px; }\n}')).toEqual([
      '12px',
    ]);
  });

  it('calcule le contraste WCAG', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#5865d8')).toBeCloseTo(4.92, 1);
  });

  it('lit les trois blocs de thème', () => {
    const blocks = parseThemeBlocks(SAMPLE_TOKENS);
    expect(blocks.light['--lp-color-text']).toBe('#14151a');
    expect(blocks.darkMedia['--lp-color-text']).toBe('#f7f8f8');
    expect(blocks.darkAttr['--lp-color-text']).toBe('#f7f8f8');
    expect(blocks.darkMedia['--lp-color-dialog-backdrop']).toBe('rgb(0 0 0 / 72%)');
  });

  it('liste les fichiers en excluant specs et node_modules', () => {
    const files = listFiles('scripts', ['.ts']);
    expect(files.some((f) => f.endsWith('design-guard.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('.spec.ts'))).toBe(false);
  });
});

describe('findSelfReferencingProperties', () => {
  it('repère une propriété personnalisée qui se référence elle-même', () => {
    expect(findSelfReferencingProperties(':root { --a: var(--a); --b: var(--a, 1rem); }')).toEqual([
      '--a',
    ]);
  });

  it('ignore les références à une autre propriété et les commentaires', () => {
    expect(
      findSelfReferencingProperties(':root { --a: 1rem; --b: var(--a); } /* --c: var(--c); */'),
    ).toEqual([]);
  });
});
