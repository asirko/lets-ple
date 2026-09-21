import type { ComponentShowcase } from '@lets-ple/ui';
import type { Sym } from '../../domain/types';
import { LpCipherTable } from './lp-cipher-table';

const QUELQUES_CORRESPONDANCES: ReadonlyMap<number, Sym> = new Map([
  [3, 'E'],
  [7, 'A'],
  [12, 'S'],
]);

export const LP_CIPHER_TABLE_SHOWCASE: ComponentShowcase<LpCipherTable> = {
  component: LpCipherTable,
  controls: {
    known: {
      kind: 'preset',
      options: {
        Vide: () => new Map<number, Sym>(),
        'Quelques correspondances': () => QUELQUES_CORRESPONDANCES,
        'Alphabet complet': () => new Map(
          [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((symbol, index) => [index + 1, symbol]),
        ),
      },
      default: 'Quelques correspondances',
    },
  },
};
