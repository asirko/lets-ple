import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { ComponentShowcase } from '../showcase.types';
import { LpDialog } from './lp-dialog';

@Component({
  selector: 'lp-dialog-showcase',
  imports: [LpDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="b-button b-secondary"
      data-dialog-showcase-reopen
      [disabled]="open()"
      (click)="open.set(true)"
    >
      Rouvrir la modale
    </button>
    <lp-dialog
      [open]="open()"
      [title]="title()"
      [closeOnEscape]="closeOnEscape()"
      (dismissed)="open.set(false)"
    >
      <div lpDialogBody data-dialog-showcase-long-content>
        <p>
          Passez le téléphone sans révéler votre réponse. Le prochain joueur dispose du même plateau
          et peut reprendre la manche dès qu'il est prêt.
        </p>
        <details>
          <summary>Pourquoi cette étape&nbsp;?</summary>
          <p>
            Elle évite que le joueur suivant voie le dernier mot proposé avant de prendre la main.
          </p>
        </details>
        @for (paragraph of longContent; track $index) {
          <p>{{ paragraph }}</p>
        }
      </div>
      <div lpDialogActions>
        <button type="button" class="b-button b-primary" (click)="open.set(false)">
          Continuer
        </button>
      </div>
    </lp-dialog>
  `,
})
export class LpDialogShowcase {
  readonly open = model(true);
  readonly title = input('À vous de jouer');
  readonly closeOnEscape = input(false);
  protected readonly longContent = Array.from(
    { length: 10 },
    (_, index) =>
      `Consigne ${index + 1} : le téléphone reste face cachée pendant le passage de main, puis le joueur confirme qu'il est prêt avant de continuer.`,
  );
}

export const LP_DIALOG_SHOWCASE: ComponentShowcase<LpDialogShowcase> = {
  component: LpDialogShowcase,
  controls: {
    open: { kind: 'boolean', default: true },
    title: { kind: 'text', default: 'À vous de jouer' },
    closeOnEscape: { kind: 'boolean', default: false },
  },
};
