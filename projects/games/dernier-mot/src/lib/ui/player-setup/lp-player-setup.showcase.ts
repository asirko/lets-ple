import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpPlayerSetup } from './lp-player-setup';

@Component({
  selector: 'lp-player-setup-showcase',
  imports: [LpPlayerSetup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_dernier-mot.scss'],
  template: `<lp-player-setup [names]="names()" />`,
})
export class LpPlayerSetupShowcase {
  readonly names = input<readonly string[]>([]);
}

export const LP_PLAYER_SETUP_SHOWCASE: ComponentShowcase<LpPlayerSetupShowcase> = {
  component: LpPlayerSetupShowcase,
  controls: {
    names: {
      kind: 'preset',
      options: {
        'Aucun joueur': () => [],
        'Un joueur': () => ['Alice'],
        'Deux joueurs': () => ['Alice', 'Basile'],
        'Beaucoup de joueurs': () => ['Alice', 'Basile', 'Chloé', 'Djamila', 'Émile', 'Fatou'],
      },
      default: 'Deux joueurs',
    },
  },
};
