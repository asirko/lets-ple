import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { DictionaryManifest } from '../../dictionary/serialized-dictionary';
import { LpDictionaryCredits } from '../credits/lp-dictionary-credits';
import { LpPlayerSetup } from '../player-setup/lp-player-setup';

@Component({
  selector: 'lp-dernier-mot-setup-page',
  imports: [LpDictionaryCredits, LpPlayerSetup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dernier-mot-setup-page">
      <lp-player-setup (playersSubmitted)="playersSubmitted.emit($event)" />
      @if (manifest(); as dictionaryManifest) {
        <lp-dictionary-credits [manifest]="dictionaryManifest" />
      }
    </div>
  `,
})
export class LpDernierMotSetupPage {
  readonly manifest = input<DictionaryManifest | null>(null);
  readonly playersSubmitted = output<readonly string[]>();
}
