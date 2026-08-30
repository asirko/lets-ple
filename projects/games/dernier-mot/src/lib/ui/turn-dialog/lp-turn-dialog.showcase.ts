import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpTurnDialog, type TurnDialogView } from './lp-turn-dialog';

const PLAYERS = [
  { id: 'alice', name: 'Alice', score: 12, active: true },
  { id: 'basile', name: 'Basile', score: 12, active: true },
  { id: 'chloe', name: 'Chloé', score: 8, active: false },
];

const VIEWS: Readonly<Record<string, () => TurnDialogView>> = {
  'Premier joueur': () => ({
    kind: 'first-player',
    title: 'Alice commence',
    message: 'Passez le téléphone à Alice.',
    primaryActionLabel: 'Alice est prête',
  }),
  'Lettre valide': () => ({
    kind: 'valid-prefix',
    title: 'La manche continue',
    message: '12 prolongements restent possibles.',
    primaryActionLabel: 'Passer à Basile',
  }),
  'Mot intermédiaire': () => ({
    kind: 'intermediate-word',
    title: 'CHAT rapporte 1 point',
    message: 'Alice forme un mot valide. 12 prolongements restent possibles.',
    primaryActionLabel: 'Passer à Basile',
    word: 'CHAT',
    definitions: ['Petit mammifère carnivore domestique de la famille des félidés.'],
  }),
  Élimination: () => ({
    kind: 'invalid-letter',
    title: 'CHAX est impossible',
    message: 'Alice perd 1 point et est éliminée de la manche.',
    primaryActionLabel: 'Passer à Basile',
    word: 'CHAX',
  }),
  'Fin par éliminations': () => ({
    kind: 'elimination-round-end',
    title: 'Fin de la manche',
    message: 'Aucun joueur ne gagne cette manche.',
    primaryActionLabel: 'Basile commence la manche suivante',
    completions: ['CHAI', 'CHALET', 'CHAMOIS', 'CHAPEAU', 'CHARIOT'],
    players: PLAYERS,
  }),
  'Mot terminal': () => ({
    kind: 'terminal-word',
    title: 'Dernier mot !',
    message: 'Alice marque 3 points avec ZYGOTE.',
    primaryActionLabel: 'Commencer la manche suivante',
    word: 'ZYGOTE',
    definitions: ['Cellule issue de la fusion de deux gamètes.'],
    players: PLAYERS,
  }),
  'Fin de partie': () => ({
    kind: 'game-over',
    title: 'Alice et Basile gagnent',
    message: 'Victoire ex æquo avec 12 points.',
    primaryActionLabel: 'Refaire une partie',
    players: PLAYERS,
    winnerIds: ['alice', 'basile'],
  }),
};

@Component({
  selector: 'lp-turn-dialog-showcase',
  imports: [LpTurnDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_dernier-mot.scss'],
  template: `
    <button type="button" class="b-button b-secondary" [disabled]="open()" (click)="open.set(true)">
      Rouvrir la modale
    </button>
    <lp-turn-dialog
      [open]="open()"
      [view]="view()"
      [definitionExpanded]="definitionExpanded()"
      (definitionToggled)="definitionExpanded.set(!definitionExpanded())"
      (primaryAction)="open.set(false)"
    />
  `,
})
export class LpTurnDialogShowcase {
  readonly open = model(true);
  readonly view = input.required<TurnDialogView>();
  readonly definitionExpanded = model(false);
}

export const LP_TURN_DIALOG_SHOWCASE: ComponentShowcase<LpTurnDialogShowcase> = {
  component: LpTurnDialogShowcase,
  controls: {
    open: { kind: 'boolean', default: true },
    view: { kind: 'preset', options: VIEWS, default: 'Mot intermédiaire' },
    definitionExpanded: { kind: 'boolean', default: false },
  },
};
