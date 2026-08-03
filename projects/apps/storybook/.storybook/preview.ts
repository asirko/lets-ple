import type { Preview } from '@storybook/angular-vite'
import '../../../libs/ui/src/styles/index.scss';
// Modules de jeu : chargés ici pour le confort de l'atelier, pour que les stories des composants
// du jeu s'affichent correctement même sans passer par `LpGamePage` (le point d'entrée routé qui,
// en production, embarque ce module dans son propre chunk lazy — voir docs/conventions/css.md).
import '../../../games/cryptogramme/src/styles/_cryptogramme.scss';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;