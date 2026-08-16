import type { ComponentShowcase } from '@lets-ple/ui';
import { LpGamePage } from './lp-game-page';

export const LP_GAME_PAGE_SHOWCASE: ComponentShowcase<LpGamePage> = {
  component: LpGamePage,
  controls: {
    quoteId: { kind: 'text', default: 'litterature-02' },
    text: { kind: 'text', default: 'Le cœur a ses raisons que la raison ne connaît point.' },
    author: { kind: 'text', default: 'Blaise Pascal' },
    source: { kind: 'text', default: 'Pensées, 1670' },
    seed: { kind: 'text', default: 'partie-demo' },
  },
};
