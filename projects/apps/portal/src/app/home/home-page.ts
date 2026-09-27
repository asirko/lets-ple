import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_REGISTRY, I18nService } from '@lets-ple/game-core';
import { LpCard } from '@lets-ple/ui';
import { PwaUpdateService } from '../releases/pwa-update.service';

@Component({
  selector: 'app-home-page',
  imports: [LpCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (updates.available()) {
      <p>
        <button class="b-button b-secondary" type="button" (click)="updates.requestPrompt()">
          {{
            i18n.t(
              updates.recovery() ? 'releases.update.recoveryTitle' : 'releases.update.homeAction'
            )
          }}
        </button>
      </p>
    }
    @for (game of games; track game.id) {
      <a [routerLink]="game.route" [attr.aria-label]="game.title">
        <lp-card [title]="game.title">
          {{ game.summary }}
          @for (theme of game.themes; track theme) {
            #{{ theme }}
          }
          @if (game.actionLabel) {
            <p>
              <strong>{{ game.actionLabel }}</strong>
            </p>
          }
        </lp-card>
      </a>
    }
  `,
})
export class HomePage {
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(PwaUpdateService);
  protected readonly games = GAME_REGISTRY;
}
