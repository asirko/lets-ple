import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_REGISTRY } from '@lets-ple/game-core';
import { LpCard } from '@lets-ple/ui';

@Component({
  selector: 'app-home-page',
  imports: [LpCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (game of games; track game.id) {
      <a [routerLink]="game.route">
        <lp-card [title]="game.title">
          {{ game.summary }}
          @for (theme of game.themes; track theme) {
            #{{ theme }}
          }
        </lp-card>
      </a>
    }
  `,
})
export class HomePage {
  protected readonly games = GAME_REGISTRY;
}
