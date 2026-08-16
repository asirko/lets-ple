import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ShowcaseRenderer } from '../showcase-renderer/showcase-renderer';
import type { ComponentShowcase } from '@lets-ple/ui';

@Component({
  selector: 'app-component-page',
  imports: [ShowcaseRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showcase(); as showcase) {
      <app-showcase-renderer [showcase]="showcase" />
    }
  `,
})
export class ComponentPage {
  protected readonly showcase = signal<ComponentShowcase<unknown> | null>(null);

  constructor(route: ActivatedRoute) {
    const loadShowcase = route.snapshot.data['loadShowcase'] as () => Promise<ComponentShowcase<unknown>>;
    loadShowcase().then((showcase) => this.showcase.set(showcase));
  }
}
