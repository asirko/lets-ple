import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpWordProgress } from './lp-word-progress';

interface WordProgressShowcaseState {
  readonly prefix: string;
  readonly isWord: boolean;
  readonly continuationCount: number;
  readonly attemptedLetter: string;
}

@Component({
  selector: 'lp-word-progress-showcase',
  imports: [LpWordProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_dernier-mot.scss'],
  template: `
    <lp-word-progress
      [prefix]="state().prefix"
      [isWord]="state().isWord"
      [continuationCount]="state().continuationCount"
      [attemptedLetter]="state().attemptedLetter"
    />
  `,
})
export class LpWordProgressShowcase {
  readonly state = input.required<WordProgressShowcaseState>();
}

export const LP_WORD_PROGRESS_SHOWCASE: ComponentShowcase<LpWordProgressShowcase> = {
  component: LpWordProgressShowcase,
  controls: {
    state: {
      kind: 'preset',
      options: {
        'Préfixe vide': () => ({
          prefix: '',
          isWord: false,
          continuationCount: 0,
          attemptedLetter: '',
        }),
        'Préfixe intermédiaire': () => ({
          prefix: 'CHA',
          isWord: false,
          continuationCount: 12,
          attemptedLetter: '',
        }),
        'Mot intermédiaire': () => ({
          prefix: 'CHAT',
          isWord: true,
          continuationCount: 12,
          attemptedLetter: '',
        }),
        'Mot terminal': () => ({
          prefix: 'ZYGOTE',
          isWord: true,
          continuationCount: 0,
          attemptedLetter: '',
        }),
        'Lettre tentée': () => ({
          prefix: 'CHA',
          isWord: false,
          continuationCount: 12,
          attemptedLetter: 'X',
        }),
      },
      default: 'Préfixe intermédiaire',
    },
  },
};
