import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpCryptogramGrid } from './lp-cryptogram-grid';
import { createGame, isPlayable, reduce } from '../../domain/game';

const meta: Meta<LpCryptogramGrid> = {
  title: 'Cryptogramme/LpCryptogramGrid',
  component: LpCryptogramGrid,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<LpCryptogramGrid>;

const CITATION = "Rien n'est plus puissant qu'une idee dont l'heure est venue.";

function partieAvecMainTiree() {
  let state = createGame('q1', CITATION, { seed: 'grille-demo' });
  state = reduce(state, { type: 'DRAW' });
  return state;
}

export const PlateauInitial: Story = {
  args: {
    board: createGame('q1', CITATION, { seed: 'grille-demo' }).board,
  },
};

export const AvecCaseJouable: Story = {
  render: () => {
    const state = partieAvecMainTiree();
    return {
      props: {
        board: state.board,
        playableCells: state.board.map((_c, i) => isPlayable(state, i)),
      },
      template: `<lp-cryptogram-grid [board]="board" [playableCells]="playableCells" />`,
    };
  },
};

export const AvecCaseSelectionnee: Story = {
  render: () => {
    const state = partieAvecMainTiree();
    const index = state.board.findIndex((c) => c.kind === 'letter' && c.filled === null);
    return {
      props: { board: state.board, selectedCell: index },
      template: `<lp-cryptogram-grid [board]="board" [selectedCell]="selectedCell" />`,
    };
  },
};
