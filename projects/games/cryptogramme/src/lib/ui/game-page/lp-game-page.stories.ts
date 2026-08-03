import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpGamePage } from './lp-game-page';

/**
 * Citation d'exemple pour la vérification manuelle (voir procédure décrite dans le rapport de la
 * tâche 15) : reprise telle quelle de `content/quotes/litterature.json` (id `litterature-02`),
 * courte et porteuse d'accents (œ, î) pour couvrir la gestion des accents du moteur.
 */
const meta: Meta<LpGamePage> = {
  title: 'Cryptogramme/LpGamePage',
  component: LpGamePage,
  tags: ['autodocs'],
  args: {
    quoteId: 'litterature-02',
    text: 'Le cœur a ses raisons que la raison ne connaît point.',
    author: 'Blaise Pascal',
    source: 'Pensées, 1670',
    seed: 'partie-demo',
  },
};

export default meta;
type Story = StoryObj<LpGamePage>;

export const PartieEnCours: Story = {};
