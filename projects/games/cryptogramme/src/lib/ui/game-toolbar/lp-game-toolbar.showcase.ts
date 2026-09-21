import type { ComponentShowcase } from '@lets-ple/ui';
import { Component, ViewEncapsulation, input } from '@angular/core';
import { LpGameToolbar } from './lp-game-toolbar';

/** Le point d'entrée showcase charge les styles du jeu comme le fait sa page routée. */
@Component({
  imports: [LpGameToolbar],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_cryptogramme.scss', '../../../styles/_game-toolbar.scss'],
  template: `<lp-game-toolbar [known]="known()" [errors]="errors()" [maxErrors]="maxErrors()"
    [remaining]="remaining()" [handFull]="handFull()" [hand]="hand()"
    [minLetters]="minLetters()" [maxLetters]="maxLetters()" [filterError]="filterError()"
    [minAvailable]="minAvailable()" [maxAvailable]="maxAvailable()" />`,
})
class GameToolbarShowcase {
  readonly known = input<ReadonlyMap<number, string>>(new Map());
  readonly errors = input(0);
  readonly maxErrors = input(3);
  readonly remaining = input(12);
  readonly handFull = input(false);
  readonly hand = input<readonly string[]>([]);
  readonly minLetters = input<number | null>(null);
  readonly maxLetters = input<number | null>(null);
  readonly minAvailable = input(1);
  readonly maxAvailable = input(500);
  readonly filterError = input<string | null>(null);
}

export const LP_GAME_TOOLBAR_SHOWCASE: ComponentShowcase<GameToolbarShowcase> = {
  component: GameToolbarShowcase,
  controls: {
    errors: { kind: 'number', default: 1 },
    maxErrors: { kind: 'number', default: 3 },
    remaining: { kind: 'number', default: 12 },
    handFull: { kind: 'boolean', default: false },
    hand: { kind: 'preset', options: { Vide: () => [], Remplie: () => ['A', 'E', 'S'] }, default: 'Remplie' },
    known: { kind: 'preset', options: {
      Vide: () => new Map(),
      Partielle: () => new Map([[1, 'A'], [4, 'E'], [12, 'S']]),
      Complète: () => new Map(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter, i) => [i + 1, letter])),
    }, default: 'Partielle' },
    minLetters: { kind: 'number', default: 30 },
    maxLetters: { kind: 'number', default: 100 },
    minAvailable: { kind: 'number', default: 10 },
    maxAvailable: { kind: 'number', default: 300 },
    filterError: { kind: 'preset', options: { Aucune: () => null, Invalide: () => 'Le minimum doit être inférieur au maximum.' }, default: 'Aucune' },
  },
};
