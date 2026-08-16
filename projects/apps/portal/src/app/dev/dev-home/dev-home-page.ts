import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dev-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Showcase de composants</h1>
    <ul class="dev-home-list">
      <li><a routerLink="style">Guide de style</a></li>
      <li><a routerLink="lp-button">LpButton</a></li>
    </ul>
  `,
})
export class DevHomePage {}
