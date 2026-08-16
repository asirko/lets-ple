import type { ComponentShowcase } from '@lets-ple/ui';
import { LpCryptogramDeck } from './lp-cryptogram-deck';

export const LP_CRYPTOGRAM_DECK_SHOWCASE: ComponentShowcase<LpCryptogramDeck> = {
  component: LpCryptogramDeck,
  controls: {
    remaining: { kind: 'number', default: 12 },
    handFull: { kind: 'boolean', default: false },
  },
};
