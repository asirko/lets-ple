import type { ComponentShowcase } from '../showcase.types';
import { LpLogo } from './lp-logo';

export const LP_LOGO_SHOWCASE: ComponentShowcase<LpLogo> = {
  component: LpLogo,
  controls: {
    variant: { kind: 'enum', options: ['full', 'mark'], default: 'full' },
    size: { kind: 'enum', options: ['sm', 'md', 'lg'], default: 'md' },
  },
};
