import type { StorybookConfig } from '@storybook/angular-vite';

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
  // (`LpGamePage`, premier composant de jeu à importer un composant `@lets-ple/ui`). Vite 8 gère
  // ça nativement (`resolve.tsconfigPaths`) — pas besoin du plugin `vite-tsconfig-paths`.
  async viteFinal(viteConfig) {
    viteConfig.resolve = { ...viteConfig.resolve, tsconfigPaths: true };
    return viteConfig;
  },
};
export default config;