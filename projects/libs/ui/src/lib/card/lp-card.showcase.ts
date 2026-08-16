import type { ComponentShowcase } from '../showcase.types';
import { LpCard } from './lp-card';

export const LP_CARD_SHOWCASE: ComponentShowcase<LpCard> = {
  component: LpCard,
  content: 'Décrypte la citation, une lettre à la fois.',
  controls: {
    title: { kind: 'text', default: 'Cryptogramme' },
    interactive: { kind: 'boolean', default: false },
  },
};
