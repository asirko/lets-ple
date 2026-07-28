import type { Preview } from '@storybook/angular-vite'
import '../../../libs/ui/src/styles/index.scss';
// Modules de jeu : chargés ici pour le confort de l'atelier. En production, chaque module part
// dans le chunk lazy de son jeu — voir docs/conventions/css.md et le point en suspens du spec
// d'architecture CSS (tâche 15).
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