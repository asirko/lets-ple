import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpCryptogramDeck } from './lp-cryptogram-deck';

const meta: Meta<LpCryptogramDeck> = {
  title: 'Cryptogramme/LpCryptogramDeck',
  component: LpCryptogramDeck,
  tags: ['autodocs'],
  args: {
    remaining: 12,
    handFull: false,
  },
};

export default meta;
type Story = StoryObj<LpCryptogramDeck>;

export const Disponible: Story = {};
export const MainPleine: Story = { args: { handFull: true } };
export const Epuisee: Story = { args: { remaining: 0 } };
