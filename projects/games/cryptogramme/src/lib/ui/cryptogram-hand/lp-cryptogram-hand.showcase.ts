import type { ComponentShowcase } from '@lets-ple/ui';
import type { Sym } from '../../domain/types';
import { LpCryptogramHand } from './lp-cryptogram-hand';

export const LP_CRYPTOGRAM_HAND_SHOWCASE: ComponentShowcase<LpCryptogramHand> = {
  component: LpCryptogramHand,
  controls: {
    hand: {
      kind: 'preset',
      options: {
        'Main vide': () => [] as readonly Sym[],
        'Une carte': () => ['E'] as readonly Sym[],
        'Cinq cartes': () => ['E', 'T', 'L', 'A', 'S'] as readonly Sym[],
      },
      default: 'Cinq cartes',
    },
  },
};
