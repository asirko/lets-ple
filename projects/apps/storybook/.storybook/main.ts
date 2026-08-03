import type { StorybookConfig } from '@storybook/angular-vite';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  "stories": [
    "../../../{libs,games}/**/*.mdx",
    "../../../{libs,games}/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": {
    "name": "@storybook/angular-vite",
    "options": {
      "compodoc": false
    }
  },
  // Le Vite de Storybook ne lit pas les `paths` du tsconfig racine par lui-même : sans ce
  // réglage, un composant qui importe `@lets-ple/ui` (ou tout autre alias de `tsconfig.json`)
  // compile via ng-packagr/l'application builder (qui, eux, résolvent ces alias), mais casse dans
  // Storybook avec une erreur de résolution de module au niveau de Vite. Exposé par la tâche 15
  // (`LpGamePage`, premier composant de jeu à importer un composant `@lets-ple/ui`).
  //
  // Deux approches génériques ont été essayées et écartées : le `resolve.tsconfigPaths: true`
  // natif de Vite 8, et le plugin `vite-tsconfig-paths` (même restreint via son option
  // `projects`) — les deux suivent la chaîne `references` du `tsconfig.json` racine (un fichier
  // « solution style », `files: []` + `references`), qui inclut
  // `projects/games/cryptogramme/tsconfig.lib.json`. Or ce fichier déclare volontairement SA
  // PROPRE surcharge de `@lets-ple/ui` (vers `dist/ui`, pour que le build isolé de la lib passe
  // sous ng-packagr — voir ce fichier) : les deux approches génériques finissaient par appliquer
  // cette surcharge à Storybook aussi, qui se retrouvait à importer un `.d.ts` sans JS réel
  // (`LpButton`/`LpPanel` "not exported"). D'où ces alias explicites, en dur, qui reproduisent
  // exactement les `paths` du tsconfig racine sans dépendre d'aucune découverte de tsconfig —
  // aucune ambiguïté possible avec la surcharge propre à cryptogramme.
  async viteFinal(viteConfig) {
    const newAliases = [
      {
        find: '@lets-ple/ui',
        replacement: path.resolve(dirname, '../../../libs/ui/src/public-api.ts'),
      },
      {
        find: '@lets-ple/game-core',
        replacement: path.resolve(dirname, '../../../libs/game-core/src/public-api.ts'),
      },
      {
        find: '@lets-ple/cryptogramme',
        replacement: path.resolve(dirname, '../../../games/cryptogramme/src/public-api.ts'),
      },
    ];
    viteConfig.resolve ??= {};
    const existingAlias = viteConfig.resolve.alias;
    // Fusionne sans jamais écraser ce que le préréglage Storybook/Angular a déjà posé (sous
    // forme de tableau `{find, replacement}` ou d'objet `{find: replacement}` selon la version) —
    // un remplacement pur et simple a déjà cassé le chargement JIT des feuilles de style
    // (`styleUrls`) une première fois ici.
    viteConfig.resolve.alias = Array.isArray(existingAlias)
      ? [...existingAlias, ...newAliases]
      : {
          ...(existingAlias ?? {}),
          ...Object.fromEntries(newAliases.map((a) => [a.find, a.replacement])),
        };
    return viteConfig;
  },
};
export default config;
