import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LpDialog } from '../dialog/lp-dialog';
import type { ReleaseNotes } from './release-notes';

export interface ReleaseNotesLabels {
  title: string;
  version: string;
  features: string;
  fixes: string;
  breaking: string;
  acknowledge: string;
}

@Component({
  selector: 'lp-release-notes-dialog',
  imports: [LpDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lp-dialog [open]="open()" [title]="labels().title" (dismissed)="acknowledged.emit()">
      <div lpDialogBody>
        @for (release of releases(); track release.version) {
          <section>
            <h3>{{ labels().version }} {{ release.version }}</h3>
            @for (group of groups; track group) {
              @if (release[group].length) {
                <h4>{{ labels()[group] }}</h4>
                <ul>
                  @for (entry of release[group]; track $index) {
                    <li>{{ entry }}</li>
                  }
                </ul>
              }
            }
          </section>
        }
      </div>
      <button
        lpDialogActions
        class="b-button b-primary"
        type="button"
        (click)="acknowledged.emit()"
      >
        {{ labels().acknowledge }}
      </button>
    </lp-dialog>
  `,
})
export class LpReleaseNotesDialog {
  readonly labels = input.required<ReleaseNotesLabels>();
  readonly open = input(false);
  readonly releases = input<readonly ReleaseNotes[]>([]);
  readonly acknowledged = output<void>();
  protected readonly groups = ['breaking', 'features', 'fixes'] as const;
}
