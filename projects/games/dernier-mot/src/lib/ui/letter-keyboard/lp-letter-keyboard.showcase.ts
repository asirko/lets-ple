import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpLetterKeyboard } from './lp-letter-keyboard';

@Component({
  selector: 'lp-letter-keyboard-showcase',
  imports: [LpLetterKeyboard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_dernier-mot.scss'],
  template: `<lp-letter-keyboard [disabled]="disabled()" />`,
})
export class LpLetterKeyboardShowcase {
  readonly disabled = input(false);
}

export const LP_LETTER_KEYBOARD_SHOWCASE: ComponentShowcase<LpLetterKeyboardShowcase> = {
  component: LpLetterKeyboardShowcase,
  controls: {
    disabled: { kind: 'boolean', default: false },
  },
};
