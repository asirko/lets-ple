import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LpUpdateDialog, type UpdateDialogLabels } from './lp-update-dialog';
import type { ComponentShowcase } from '../showcase.types';

export const UPDATE_DIALOG_EXAMPLE_LABELS: UpdateDialogLabels = {
  title: 'Une mise à jour est disponible',
  recoveryTitle: 'Recharger l’application',
  message: 'Une nouvelle version est prête. Mettez à jour Let’s Plé pour en profiter.',
  hint: 'La page sera rechargée. Vous pouvez aussi continuer à jouer et mettre à jour plus tard.',
  recoveryMessage:
    'Certains fichiers de l’application ne sont plus disponibles. Rechargez la page pour reprendre.',
  later: 'Plus tard',
  update: 'Mettre à jour',
  reload: 'Recharger',
};

@Component({
  selector: 'lp-update-dialog-showcase',
  imports: [LpUpdateDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="b-button b-secondary" type="button" (click)="open.set(true)">
      Afficher la mise à jour
    </button>
    <lp-update-dialog
      class="theme-focus"
      [open]="open()"
      [recovery]="recovery()"
      [labels]="labels"
      (later)="open.set(false)"
      (update)="open.set(false)"
    />
  `,
})
export class LpUpdateDialogShowcase {
  readonly labels = UPDATE_DIALOG_EXAMPLE_LABELS;
  readonly recovery = input(false);
  readonly open = signal(false);
}
export const LP_UPDATE_DIALOG_SHOWCASE: ComponentShowcase<LpUpdateDialogShowcase> = {
  component: LpUpdateDialogShowcase,
  controls: { recovery: { kind: 'boolean', default: false } },
};
