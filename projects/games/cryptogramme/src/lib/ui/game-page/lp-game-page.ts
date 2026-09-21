import { ChangeDetectionStrategy, Component, type OnChanges, type SimpleChanges, ViewEncapsulation, input, output, signal } from '@angular/core';
import { LpButton, LpPanel, LpDialog } from '@lets-ple/ui';
import { GameStore } from '../../store/game.store';
import type { GameState } from '../../domain/game';
import { LpCryptogramGrid } from '../cryptogram-grid/lp-cryptogram-grid';
import { LpGameToolbar } from '../game-toolbar/lp-game-toolbar';

/** Assembles presentation components around the game store; loads the game's lazy global styles. */
@Component({
  selector: 'lp-game-page',
  imports: [LpGameToolbar, LpCryptogramGrid, LpButton, LpPanel, LpDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_cryptogramme.scss', '../../../styles/_game-toolbar.scss'],
  template: `
    <div class="crypto-page" [style.--crypto-toolbar-height.px]="toolbarHeight()">
      <lp-game-toolbar
        [known]="store.state().known"
        [errors]="store.state().errors"
        [maxErrors]="store.state().puzzle.maxErrors"
        [remaining]="store.state().deck.length"
        [handFull]="!store.canDraw()"
        [hand]="store.state().hand"
        [minLetters]="minLetters()"
        [maxLetters]="maxLetters()"
        [filterError]="filterError()"
        [minAvailable]="minAvailable()"
        [maxAvailable]="maxAvailable()"
        (draw)="onDraw()"
        (playTop)="onPlay()"
        (restart)="onRestart()"
        (newGame)="newGame.emit()"
        (minLettersChange)="minLettersChange.emit($event)"
        (maxLettersChange)="maxLettersChange.emit($event)"
        (heightChange)="toolbarHeight.set($event)"
      />
      <lp-panel padding="md">
        <lp-cryptogram-grid
          [board]="store.state().board"
          [selectedCell]="store.state().selectedCell"
          [playableCells]="store.playableCells()"
          (cellSelect)="onSelect($event)"
          (cellPlay)="onPlayCell($event)"
        />
      </lp-panel>
      @if (store.state().status === 'won') {
        <lp-panel padding="md">
          <p>Bravo, citation reconstituée !</p>
          <p>{{ author() }} — {{ source() }}</p>
          <lp-button variant="primary" (click)="newGame.emit()">Nouvelle partie</lp-button>
        </lp-panel>
      } @else if (store.state().status === 'lost') {
        <lp-panel padding="md">
          <p role="alert">Perdu — trop d'erreurs.</p>
          <p>{{ author() }} — {{ source() }}</p>
          <lp-button variant="primary" (click)="newGame.emit()">Nouvelle partie</lp-button>
        </lp-panel>
      }
    </div>
    <lp-dialog
      [open]="store.allLettersKnown() && store.state().status !== 'lost' && !completionDismissed()"
      title="Bravo, toutes les lettres sont trouvées !"
      (dismissed)="onComplete()"
    >
      <p lpDialogBody>Vous avez découvert toutes les correspondances. Fermez cette fenêtre pour compléter la citation.</p>
      <lp-button lpDialogActions variant="primary" (click)="onComplete()">Fermer et compléter la citation</lp-button>
    </lp-dialog>
  `,
})
export class LpGamePage implements OnChanges {
  readonly quoteId = input.required<string>();
  readonly text = input.required<string>();
  readonly author = input.required<string>();
  readonly source = input.required<string>();
  readonly seed = input.required<string>();
  readonly minLetters = input<number | null>(null);
  readonly maxLetters = input<number | null>(null);
  readonly filterError = input<string | null>(null);
  readonly minAvailable = input(1);
  readonly maxAvailable = input(500);
  readonly initialState = input<GameState | undefined>(undefined);
  readonly stateChange = output<GameState>();
  readonly minLettersChange = output<number | null>();
  readonly maxLettersChange = output<number | null>();
  readonly newGame = output<void>();
  protected store!: GameStore;
  protected readonly completionDismissed = signal(false);
  protected readonly toolbarHeight = signal(0);

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.store || changes['quoteId'] || changes['text'] || changes['seed']) {
      this.store = new GameStore(this.quoteId(), this.text(), { seed: this.seed() }, this.initialState());
      this.completionDismissed.set(this.initialState()?.status === 'won');
      this.stateChange.emit(this.store.state());
    }
  }

  protected onRestart(): void {
    this.completionDismissed.set(false);
    this.store.restart(crypto.randomUUID());
    this.stateChange.emit(this.store.state());
  }

  protected onComplete(): void {
    this.store.complete();
    this.completionDismissed.set(true);
    this.stateChange.emit(this.store.state());
  }

  protected onDraw(): void {
    this.store.draw();
    this.stateChange.emit(this.store.state());
  }

  protected onPlay(): void {
    this.store.play();
    this.stateChange.emit(this.store.state());
  }

  protected onSelect(index: number): void {
    this.store.selectCell(index);
    this.stateChange.emit(this.store.state());
  }

  protected onPlayCell(index: number): void {
    const state = this.store.state();
    const cell = state.board[index];
    if (state.status !== 'playing' || this.store.topCard() === null || cell?.kind !== 'letter' || cell.filled !== null) return;
    if (state.selectedCell !== index) this.store.selectCell(index);
    this.onPlay();
  }
}
