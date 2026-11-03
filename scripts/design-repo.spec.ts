/**
 * Garde-fous de design appliqués au dépôt réel (tokens, usages). Exécuté depuis la racine.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  findLengthLiterals,
  findLiteralColors,
  findSelfReferencingProperties,
  listFiles,
  parseThemeBlocks,
} from './design-guard';

const STYLES = 'projects/libs/ui/src/styles';

/** Feuilles qui ne doivent plus contenir de couleur ni de longueur en dur. */
const GUARDED_STYLES: string[] = [
  'module/_home-concept.scss',
  'module/_button.scss',
  'module/_card.scss',
  'module/_dialog.scss',
  'module/_panel.scss',
  'module/_logo.scss',
  'module/_loader.scss',
  '_layout.scss',
]
  .map((f) => `${STYLES}/${f}`)
  .concat(
    ['_quiz.scss', '_quiz-correction.scss', '_knowledge-stats.scss', '_globe.scss'].map(
      (f) => `projects/games/quiz/src/styles/${f}`,
    ),
  );

const tokens = parseThemeBlocks(readFileSync('projects/libs/ui/src/styles/tokens.scss', 'utf8'));

describe('tokens de thème', () => {
  it('définit les mêmes tokens couleur dans les trois blocs', () => {
    expect(Object.keys(tokens.darkMedia).sort()).toEqual(Object.keys(tokens.light).sort());
    expect(tokens.darkAttr).toEqual(tokens.darkMedia);
  });

  it.each(['light', 'darkMedia'] as const)('tient le contraste AA en %s', (mode) => {
    const t = tokens[mode];
    for (const [fg, bg] of [
      ['text', 'background'],
      ['text-muted', 'background'],
      ['text-muted', 'surface-raised'],
      ['primary-contrast', 'primary'],
      ['primary-contrast', 'primary-hover'],
      ['success-contrast', 'success'],
      ['danger-contrast', 'danger'],
      ['link', 'background'],
      ['link', 'surface'],
      ['link', 'surface-raised'],
      ['accent', 'background'],
      ['danger', 'background'],
      ['success', 'background'],
      ['danger', 'surface'],
      ['success', 'surface'],
    ]) {
      expect(
        contrastRatio(t[`--lp-color-${fg}`], t[`--lp-color-${bg}`]),
        `${fg}/${bg}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrastRatio(t['--lp-color-focus-ring'], t['--lp-color-background']),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('thème racine', () => {
  it("n'utilise plus la classe theme-focus", () => {
    const hits = listFiles('projects', ['.ts', '.html', '.scss']).filter((f) =>
      readFileSync(f, 'utf8').includes('theme-focus'),
    );
    expect(hits).toEqual([]);
  });
});

describe('écran de chargement', () => {
  const index = readFileSync('projects/apps/portal/src/index.html', 'utf8');

  it("affiche l'écran de chargement dans app-root", () => {
    expect(index).toMatch(/<app-root>\s*<div class="boot-splash" role="status">/);
    expect(index).toContain('<noscript>');
  });

  it("coupe l'animation si l'utilisateur réduit les mouvements", () => {
    expect(index).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[^}]*\.boot-splash-mark[^}]*animation:\s*none/s,
    );
  });

  it('ne reprend que des couleurs des tokens', () => {
    const known = new Set([...Object.values(tokens.light), ...Object.values(tokens.darkMedia)]);
    expect(findLiteralColors(index).filter((c) => !known.has(c))).toEqual([]);
  });
});

describe('lp-loader', () => {
  const loader = readFileSync('projects/libs/ui/src/styles/module/_loader.scss', 'utf8');

  it("coupe l'animation si l'utilisateur réduit les mouvements", () => {
    expect(loader).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[^}]*\.loader-mark[^}]*animation:\s*none/s,
    );
  });
});

describe('actions de dialogue', () => {
  const dialog = readFileSync('projects/libs/ui/src/styles/module/_dialog.scss', 'utf8');

  it("n'applique la règle des conteneurs ni aux boutons ni aux hôtes lp-button", () => {
    const selector = /\.dialog-actions > (\[lpDialogActions\][^{]*)\{/.exec(dialog)?.[1] ?? '';
    expect(selector).toContain(':not(.b-button)');
    expect(selector).toContain(':not(lp-button)');
  });
});

describe('boutons du quiz', () => {
  const files = listFiles('projects/games/quiz/src/lib/ui', ['.ts', '.html']).filter(
    (f) => !f.endsWith('.spec.ts'),
  );

  it('donne une variante à chaque b-button', () => {
    const hits = files.filter((f) => /class="b-button"/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it("n'utilise plus quiz-toolbar-action", () => {
    const hits = files.filter((f) => readFileSync(f, 'utf8').includes('quiz-toolbar-action'));
    expect(hits).toEqual([]);
  });
});

describe.each(GUARDED_STYLES)('feuille gardée %s', (file) => {
  const source = readFileSync(file, 'utf8');

  it('sans couleur en dur', () => {
    expect(findLiteralColors(source)).toEqual([]);
  });

  it('sans longueur en dur', () => {
    expect(findLengthLiterals(source)).toEqual([]);
  });

  it('sans propriété personnalisée qui se référence elle-même', () => {
    expect(findSelfReferencingProperties(source)).toEqual([]);
  });
});

describe('couleurs des globes', () => {
  const GLOBE_TOKENS = [
    '--lp-globe-ocean',
    '--lp-globe-land',
    '--lp-globe-border',
    '--lp-globe-space',
    '--lp-globe-sea',
    '--lp-globe-outline',
    '--lp-globe-marker',
    '--lp-globe-highlight',
    '--lp-globe-highlight-contrast',
    '--lp-knowledge-none',
    '--lp-knowledge-insufficient',
    '--lp-knowledge-stripe',
    '--lp-knowledge-low',
    '--lp-knowledge-medium',
    '--lp-knowledge-high',
  ];

  it('aucune couleur littérale dans le code du quiz', () => {
    const files = listFiles('projects/games/quiz/src/lib', ['.ts']).filter(
      (f) => !f.endsWith('.spec.ts'),
    );
    const hits = files.filter((f) => findLiteralColors(readFileSync(f, 'utf8')).length > 0);
    expect(hits).toEqual([]);
  });

  it.each(['light', 'darkMedia', 'darkAttr'] as const)('définit les tokens globe en %s', (mode) => {
    for (const name of GLOBE_TOKENS) expect(tokens[mode][name], name).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(['light', 'darkMedia'] as const)(
    'garde terre, océan et frontières lisibles en %s',
    (mode) => {
      const t = tokens[mode];
      expect(contrastRatio(t['--lp-globe-land'], t['--lp-globe-ocean'])).toBeGreaterThanOrEqual(
        1.5,
      );
      expect(contrastRatio(t['--lp-globe-border'], t['--lp-globe-land'])).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(['light', 'darkMedia'] as const)(
    'fait ressortir le pays cherché et son contour en %s',
    (mode) => {
      const t = tokens[mode];
      expect(
        contrastRatio(t['--lp-globe-highlight'], t['--lp-globe-land']),
        'highlight/land',
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(t['--lp-globe-highlight-contrast'], t['--lp-globe-highlight']),
        'highlight-contrast/highlight',
      ).toBeGreaterThanOrEqual(3);
    },
  );

  it("n'utilise plus la couleur primaire pour le pays cherché", () => {
    const sources = [
      'projects/games/quiz/src/lib/globe/three-globe.ts',
      'projects/games/quiz/src/styles/_globe.scss',
      'projects/games/quiz/src/styles/_quiz-correction.scss',
    ].map((f) => readFileSync(f, 'utf8'));
    for (const source of sources) expect(source).not.toMatch(/--lp-color-primary/);
  });

  it.each(['light', 'darkMedia'] as const)(
    'distingue les niveaux de connaissance entre eux et du fond en %s',
    (mode) => {
      const t = tokens[mode];
      const levels = ['none', 'insufficient', 'low', 'medium', 'high'].map(
        (l) => t[`--lp-knowledge-${l}`],
      );
      for (const c of levels)
        expect(contrastRatio(c, t['--lp-globe-sea'])).toBeGreaterThanOrEqual(1.5);
      for (let i = 0; i < levels.length; i++)
        for (let j = i + 1; j < levels.length; j++) expect(levels[i]).not.toBe(levels[j]);
    },
  );
});
