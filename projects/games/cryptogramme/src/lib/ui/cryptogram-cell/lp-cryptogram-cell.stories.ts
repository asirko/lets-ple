import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LpCryptogramCell } from './lp-cryptogram-cell';
import type { Cell } from '../../domain/types';

const meta: Meta<LpCryptogramCell> = {
  title: 'Cryptogramme/LpCryptogramCell',
  component: LpCryptogramCell,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<LpCryptogramCell>;

const FIXED: Cell = { kind: 'fixed', char: ' ' };
const VIDE: Cell = { kind: 'letter', code: 7, char: 'e', filled: null, given: false };
const REMPLIE: Cell = { kind: 'letter', code: 3, char: 'l', filled: 'L', given: true };

export const Fixe: Story = { args: { cell: FIXED } };
export const Vide: Story = { args: { cell: VIDE } };
export const Jouable: Story = { args: { cell: VIDE, playable: true } };
export const Selectionnee: Story = { args: { cell: VIDE, selected: true } };
export const Remplie: Story = { args: { cell: REMPLIE } };
