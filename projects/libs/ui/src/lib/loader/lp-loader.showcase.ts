import type { ComponentShowcase } from '../showcase.types';
import { LpLoader } from './lp-loader';

export const LP_LOADER_SHOWCASE: ComponentShowcase<LpLoader> = {
  component: LpLoader,
  controls: {
    label: {
      kind: 'preset',
      options: {
        court: () => 'Chargement…',
        long: () => 'Préparation de votre voyage autour du monde, presque prêt…',
      },
      default: 'court',
    },
    size: { kind: 'enum', options: ['md', 'sm'], default: 'md' },
  },
};
