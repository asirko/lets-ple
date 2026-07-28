import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpCryptogramHand } from './lp-cryptogram-hand';

const meta: Meta<LpCryptogramHand> = {
  title: 'Cryptogramme/LpCryptogramHand',
  component: LpCryptogramHand,
  tags: ['autodocs'],
  argTypes: {
    hand: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<LpCryptogramHand>;

export const MainVide: Story = { args: { hand: [] } };
export const UneCarte: Story = { args: { hand: ['E'] } };
export const CinqCartes: Story = { args: { hand: ['E', 'T', 'L', 'A', 'S'] } };
