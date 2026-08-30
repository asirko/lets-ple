import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';

export interface ScoreboardPlayer {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly active: boolean;
}

@Component({
  selector: 'lp-scoreboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dernier-mot-scoreboard" [attr.aria-label]="text('dernierMot.scoreboard.label')">
      <ul class="dernier-mot-score-list">
        @for (player of players(); track player.id) {
          <li
            class="dernier-mot-score-player"
            data-score-player
            [class.is-current]="isCurrent(player)"
            [class.is-eliminated]="!player.active && !isWinner(player.id)"
            [class.is-winner]="isWinner(player.id)"
            [attr.aria-current]="isCurrent(player) ? 'true' : null"
            [attr.data-winner]="isWinner(player.id)"
          >
            <span class="dernier-mot-score-name">
              {{ player.name }}
              @if (isWinner(player.id)) {
                <span class="dernier-mot-score-state">{{
                  text('dernierMot.scoreboard.winner')
                }}</span>
              } @else if (!player.active) {
                <span class="dernier-mot-score-state">{{
                  text('dernierMot.scoreboard.eliminated')
                }}</span>
              } @else if (isCurrent(player)) {
                <span class="dernier-mot-score-state">{{
                  text('dernierMot.scoreboard.current')
                }}</span>
              }
            </span>
            <strong class="dernier-mot-score-value">
              {{ player.score }}
              <span class="dernier-mot-score-unit">{{ text('dernierMot.scoreboard.points') }}</span>
            </strong>
          </li>
        }
      </ul>
    </section>
  `,
})
export class LpScoreboard {
  readonly players = input.required<readonly ScoreboardPlayer[]>();
  readonly currentPlayerId = input('');
  readonly winnerIds = input<readonly string[]>([]);
  private readonly i18n = inject(I18nService);

  protected isWinner(playerId: string): boolean {
    return this.winnerIds().includes(playerId);
  }

  protected isCurrent(player: ScoreboardPlayer): boolean {
    return player.active && player.id === this.currentPlayerId();
  }

  protected text(key: string): string {
    return this.i18n.t(key);
  }
}
