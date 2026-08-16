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
      <li><a routerLink="lp-card">LpCard</a></li>
      <li><a routerLink="lp-panel">LpPanel</a></li>
      <li><a routerLink="lp-cryptogram-cell">LpCryptogramCell</a></li>
      <li><a routerLink="lp-cipher-table">LpCipherTable</a></li>
      <li><a routerLink="lp-cryptogram-deck">LpCryptogramDeck</a></li>
      <li><a routerLink="lp-cryptogram-hand">LpCryptogramHand</a></li>
      <li><a routerLink="lp-error-counter">LpErrorCounter</a></li>
      <li><a routerLink="lp-cryptogram-grid">LpCryptogramGrid</a></li>
    </ul>
  `,
})
export class DevHomePage {}
