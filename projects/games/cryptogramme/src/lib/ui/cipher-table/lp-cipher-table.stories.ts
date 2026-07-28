import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpCipherTable } from './lp-cipher-table';

const meta: Meta<LpCipherTable> = {
  title: 'Cryptogramme/LpCipherTable',
  component: LpCipherTable,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<LpCipherTable>;

export const Vide: Story = { args: { known: new Map() } };
export const QuelquesCorrespondances: Story = {
  args: {
    known: new Map([
      [3, 'E'],
      [7, 'A'],
      [12, 'S'],
    ]),
  },
};
