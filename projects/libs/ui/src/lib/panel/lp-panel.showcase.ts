import type { ComponentShowcase } from '../showcase.types';
import { LpPanel } from './lp-panel';

export const LP_PANEL_SHOWCASE: ComponentShowcase<LpPanel> = {
  component: LpPanel,
  content: 'Contenu du panneau.',
  controls: {
    elevated: { kind: 'boolean', default: false },
    padding: { kind: 'enum', options: ['none', 'sm', 'md', 'lg'], default: 'md' },
  },
};
