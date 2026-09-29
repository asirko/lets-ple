import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ReviewComposition } from '../../domain/silhouette-composition';

/** Présentation partagée entre la revue et les questions du quiz. */
@Component({
  selector: 'lp-composed-silhouette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="quiz-review-composition"
      [attr.viewBox]="composition().viewBox"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (box of composition().boxes; track $index) {
        <g>
          <rect
            [attr.x]="box.x"
            [attr.y]="box.y"
            [attr.width]="box.width"
            [attr.height]="box.height"
          />
          <svg
            [attr.x]="box.x + 5"
            [attr.y]="box.y + 5"
            [attr.width]="box.width - 10"
            [attr.height]="box.height - 32"
            [attr.viewBox]="box.viewBox || '0 0 480 300'"
          >
            <path [attr.d]="box.path" fill-rule="evenodd" />
          </svg>
          <text [attr.x]="box.x + 8" [attr.y]="box.y + box.height - 9">{{ box.label }}</text>
        </g>
      }
    </svg>
  `,
})
export class ComposedSilhouette {
  readonly composition = input.required<ReviewComposition>();
  readonly label = input.required<string>();
}
