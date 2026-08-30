import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpScoreboard, type ScoreboardPlayer } from './lp-scoreboard';

interface ScoreboardShowcaseState {
  readonly players: readonly ScoreboardPlayer[];
  readonly currentPlayerId: string;
  readonly winnerIds: readonly string[];
}

@Component({
  selector: 'lp-scoreboard-showcase',
  imports: [LpScoreboard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_dernier-mot.scss'],
  template: `
    <lp-scoreboard
      [players]="state().players"
      [currentPlayerId]="state().currentPlayerId"
      [winnerIds]="state().winnerIds"
    />
  `,
})
export class LpScoreboardShowcase {
  readonly state = input.required<ScoreboardShowcaseState>();
}

export const LP_SCOREBOARD_SHOWCASE: ComponentShowcase<LpScoreboardShowcase> = {
  component: LpScoreboardShowcase,
  controls: {
    state: {
      kind: 'preset',
      options: {
        'Partie en cours': () => ({
          players: [
            { id: 'alice', name: 'Alice', score: 4, active: true },
            { id: 'basile', name: 'Basile', score: 3, active: true },
            { id: 'chloe', name: 'Chloé', score: 2, active: false },
          ],
          currentPlayerId: 'basile',
          winnerIds: [],
        }),
        'Scores ex æquo': () => ({
          players: [
            { id: 'alice', name: 'Alice', score: 12, active: true },
            { id: 'basile', name: 'Basile', score: 12, active: true },
            { id: 'chloe', name: 'Chloé', score: 10, active: true },
          ],
          currentPlayerId: '',
          winnerIds: ['alice', 'basile'],
        }),
      },
      default: 'Partie en cours',
    },
  },
};
