import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'lp-card',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (interactive()) {
      <div class="card card-interactive" tabindex="0" role="button">
        <ng-container *ngTemplateOutlet="content" />
      </div>
    } @else {
      <article class="card">
        <ng-container *ngTemplateOutlet="content" />
      </article>
    }
    <ng-template #content>
      @if (title()) {
        <h3 class="card-title">{{ title() }}</h3>
      }
      <div class="card-body">
        <ng-content />
      </div>
    </ng-template>
  `,
})
export class LpCard {
  readonly title = input<string>();
  readonly interactive = input(false);
}
