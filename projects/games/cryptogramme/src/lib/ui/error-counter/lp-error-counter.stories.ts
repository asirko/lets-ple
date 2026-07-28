import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpErrorCounter } from './lp-error-counter';

const meta: Meta<LpErrorCounter> = {
  title: 'Cryptogramme/LpErrorCounter',
  component: LpErrorCounter,
  tags: ['autodocs'],
  args: {
    maxErrors: 3,
  },
};

export default meta;
type Story = StoryObj<LpErrorCounter>;

export const AucuneErreur: Story = { args: { errors: 0 } };
export const UneErreur: Story = { args: { errors: 1 } };
export const DeuxErreurs: Story = { args: { errors: 2 } };
export const PartiePerdue: Story = { args: { errors: 3 } };
