import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GAME_REGISTRY, I18nService } from '@lets-ple/game-core';
import { LpHomeConcept } from '@lets-ple/ui';
import { PwaUpdateService } from '../releases/pwa-update.service';

@Component({
  selector: 'app-home-page',
  imports: [LpHomeConcept],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lp-home-concept [games]="games">
      @if (updates.available()) {
        <button
          home-actions
          class="home-update-action"
          type="button"
          (click)="updates.requestPrompt()"
        >
          {{
            i18n.t(
              updates.recovery() ? 'releases.update.recoveryTitle' : 'releases.update.homeAction'
            )
          }}
        </button>
      }
    </lp-home-concept>
  `,
})
export class HomePage {
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(PwaUpdateService);
  protected readonly games = GAME_REGISTRY;
}
