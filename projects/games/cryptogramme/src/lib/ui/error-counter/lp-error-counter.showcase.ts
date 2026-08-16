import type { ComponentShowcase } from '@lets-ple/ui';
import { LpErrorCounter } from './lp-error-counter';

export const LP_ERROR_COUNTER_SHOWCASE: ComponentShowcase<LpErrorCounter> = {
  component: LpErrorCounter,
  controls: {
    errors: { kind: 'number', default: 0 },
    maxErrors: { kind: 'number', default: 3 },
  },
};
