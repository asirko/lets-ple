import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'lp-card',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (interactive()) {
      <div class="lp-card lp-card--interactive" tabindex="0" role="button">
        <ng-container *ngTemplateOutlet="content" />
      </div>
    } @else {
      <article class="lp-card">
        <ng-container *ngTemplateOutlet="content" />
      </article>
    }
    <ng-template #content>
      @if (title()) {
        <h3 class="lp-card__title">{{ title() }}</h3>
      }
      <div class="lp-card__body">
        <ng-content />
      </div>
    </ng-template>
  `,
  styleUrl: './lp-card.scss',
})
export class LpCard {
  readonly title = input<string>();
  readonly interactive = input(false);
}
