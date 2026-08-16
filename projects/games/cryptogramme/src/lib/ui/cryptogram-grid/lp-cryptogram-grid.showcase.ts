import type { ComponentShowcase } from '@lets-ple/ui';
import { createGame, isPlayable, reduce } from '../../domain/game';
import type { Cell } from '../../domain/types';
import { LpCryptogramGrid } from './lp-cryptogram-grid';

const CITATION = "Rien n'est plus puissant qu'une idee dont l'heure est venue.";

function partieDemo() {
  return createGame('q1', CITATION, { seed: 'grille-demo' });
}

function partieAvecMainTiree() {
  return reduce(partieDemo(), { type: 'DRAW' });
}

export const LP_CRYPTOGRAM_GRID_SHOWCASE: ComponentShowcase<LpCryptogramGrid> = {
  component: LpCryptogramGrid,
  controls: {
    board: {
      kind: 'preset',
      options: { 'Citation de démonstration': () => partieDemo().board as readonly Cell[] },
      default: 'Citation de démonstration',
    },
    selectedCell: {
      kind: 'preset',
      options: {
        Aucune: () => null,
        'Première case vide': () => {
          const state = partieAvecMainTiree();
          return state.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
        },
      },
      default: 'Aucune',
    },
    playableCells: {
      kind: 'preset',
      options: {
        Aucune: () => [] as readonly boolean[],
        'Après une pioche': () => {
          const state = partieAvecMainTiree();
          return state.board.map((_c, i) => isPlayable(state, i));
        },
      },
      default: 'Aucune',
    },
  },
};
