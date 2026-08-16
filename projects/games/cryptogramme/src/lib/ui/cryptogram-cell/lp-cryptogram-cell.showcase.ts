import type { ComponentShowcase } from '@lets-ple/ui';
import type { Cell } from '../../domain/types';
import { LpCryptogramCell } from './lp-cryptogram-cell';

const FIXE: Cell = { kind: 'fixed', char: ' ' };
const VIDE: Cell = { kind: 'letter', code: 7, char: 'e', filled: null, given: false };
const REMPLIE: Cell = { kind: 'letter', code: 3, char: 'l', filled: 'L', given: true };

export const LP_CRYPTOGRAM_CELL_SHOWCASE: ComponentShowcase<LpCryptogramCell> = {
  component: LpCryptogramCell,
  controls: {
    cell: {
      kind: 'preset',
      options: { Fixe: () => FIXE, Vide: () => VIDE, Remplie: () => REMPLIE },
      default: 'Vide',
    },
    selected: { kind: 'boolean', default: false },
    playable: { kind: 'boolean', default: false },
  },
};
