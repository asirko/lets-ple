import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LpReleaseNotesDialog, type ReleaseNotesLabels } from './lp-release-notes-dialog';
import type { ComponentShowcase } from '../showcase.types';
import type { ReleaseNotes } from './release-notes';

export const RELEASE_NOTES_EXAMPLE_LABELS: ReleaseNotesLabels = {
  title: 'Quoi de neuf ?',
  version: 'Version',
  features: 'Nouveautés',
  fixes: 'Corrections',
  breaking: 'Changements incompatibles',
  acknowledge: 'C’est parti !',
};

const recent: ReleaseNotes = {
  version: '0.3.0',
  date: '2026-09-27',
  features: [
    'Découvrez les nouveautés à votre retour.',
    'Choisissez quand mettre à jour votre application.',
  ],
  fixes: ['Le contraste des boutons a été amélioré.'],
  breaking: [],
};
@Component({
  selector: 'lp-release-notes-dialog-showcase',
  imports: [LpReleaseNotesDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="b-button b-secondary" type="button" (click)="open.set(true)">
      Afficher les nouveautés
    </button>
    <lp-release-notes-dialog
      class="theme-focus"
      [open]="open()"
      [releases]="releases()"
      [labels]="labels"
      (acknowledged)="open.set(false)"
    />
  `,
})
export class LpReleaseNotesDialogShowcase {
  readonly labels = RELEASE_NOTES_EXAMPLE_LABELS;
  readonly releases = input<readonly ReleaseNotes[]>([recent]);
  readonly open = signal(false);
}
export const LP_RELEASE_NOTES_DIALOG_SHOWCASE: ComponentShowcase<LpReleaseNotesDialogShowcase> = {
  component: LpReleaseNotesDialogShowcase,
  controls: {
    releases: {
      kind: 'preset',
      default: 'Dernière version',
      options: {
        'Dernière version': () => [recent],
        'Plusieurs versions': () => [
          recent,
          {
            ...recent,
            version: '0.2.0',
            breaking: ['Les anciennes préférences doivent être choisies à nouveau.'],
          },
        ],
        'Contenu long': () =>
          Array.from({ length: 8 }, (_, i) => ({ ...recent, version: `0.${8 - i}.0` })),
      },
    },
  },
};
