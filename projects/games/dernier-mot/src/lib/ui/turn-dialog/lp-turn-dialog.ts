import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import { LpDialog } from '@lets-ple/ui';
import { LpScoreboard, type ScoreboardPlayer } from '../scoreboard/lp-scoreboard';

export type TurnDialogKind =
  | 'first-player'
  | 'valid-prefix'
  | 'intermediate-word'
  | 'invalid-letter'
  | 'elimination-round-end'
  | 'terminal-word'
  | 'game-over';

/** Vue textuelle déjà calculée par l'assembleur : ce composant n'interprète aucune règle. */
export interface TurnDialogView {
  readonly kind: TurnDialogKind;
  readonly title: string;
  readonly message: string;
  readonly primaryActionLabel: string;
  readonly word?: string;
  readonly definitions?: readonly string[];
  readonly completions?: readonly string[];
  readonly players?: readonly ScoreboardPlayer[];
  readonly currentPlayerId?: string;
  readonly winnerIds?: readonly string[];
}

@Component({
  selector: 'lp-turn-dialog',
  imports: [LpDialog, LpScoreboard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lp-dialog [open]="open()" [title]="view().title" [closeOnEscape]="false">
      <div lpDialogBody class="dernier-mot-turn-dialog">
        @if (view().word; as word) {
          <p class="dernier-mot-dialog-word" data-turn-word>{{ word }}</p>
        }
        <p class="dernier-mot-dialog-message">{{ view().message }}</p>

        @if (view().kind === 'intermediate-word' && view().definitions?.length) {
          <button
            type="button"
            class="dernier-mot-definition-toggle"
            data-definition-toggle
            [attr.aria-expanded]="definitionExpanded()"
            (click)="definitionToggled.emit()"
          >
            {{
              text(
                definitionExpanded()
                  ? 'dernierMot.dialog.hideDefinition'
                  : 'dernierMot.dialog.showDefinition'
              )
            }}
          </button>
        }

        @if (
          view().definitions?.length &&
          (view().kind === 'terminal-word' || view().kind === 'game-over' || definitionExpanded())
        ) {
          <div class="dernier-mot-definitions" data-definitions>
            @for (definition of view().definitions; track $index) {
              <p>{{ definition }}</p>
            }
          </div>
        }

        @if (view().completions?.length) {
          <div class="dernier-mot-completions">
            <h3>{{ text('dernierMot.dialog.completions') }}</h3>
            <ul>
              @for (completion of view().completions; track completion) {
                <li>{{ completion }}</li>
              }
            </ul>
          </div>
        }

        @if (view().players; as players) {
          <lp-scoreboard
            [players]="players"
            [currentPlayerId]="view().currentPlayerId ?? ''"
            [winnerIds]="view().winnerIds ?? []"
          />
        }
      </div>

      <div lpDialogActions>
        <button
          type="button"
          class="b-button b-primary"
          data-primary-action
          (click)="primaryAction.emit()"
        >
          {{ view().primaryActionLabel }}
        </button>
      </div>
    </lp-dialog>
  `,
})
export class LpTurnDialog {
  readonly open = input(false);
  readonly view = input.required<TurnDialogView>();
  readonly definitionExpanded = input(false);
  readonly primaryAction = output<void>();
  readonly definitionToggled = output<void>();
  private readonly i18n = inject(I18nService);

  protected text(key: string): string {
    return this.i18n.t(key);
  }
}
