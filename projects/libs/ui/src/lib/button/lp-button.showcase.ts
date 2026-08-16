import type { ComponentShowcase } from '../showcase.types';
import { LpButton } from './lp-button';

export const LP_BUTTON_SHOWCASE: ComponentShowcase<LpButton> = {
  component: LpButton,
  content: 'Valider',
  controls: {
    variant: { kind: 'enum', options: ['primary', 'secondary', 'danger'], default: 'primary' },
    type: { kind: 'enum', options: ['button', 'submit'], default: 'button' },
    disabled: { kind: 'boolean', default: false },
  },
};
