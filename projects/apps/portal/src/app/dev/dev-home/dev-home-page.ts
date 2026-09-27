import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dev-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Showcase de composants</h1>
    <ul class="dev-home-list">
      <li><a routerLink="lp-home-concept">Accueil Focus — catalogue</a></li>
      <li><a routerLink="style">Guide de style</a></li>
      <li><a routerLink="quiz-question">Quiz — question</a></li>
      <li><a routerLink="quiz-cash">Quiz — Cash</a></li>
      <li><a routerLink="quiz-answers">Quiz — réponses et correction</a></li>
      <li><a routerLink="quiz-toolbar">Quiz — en-tête et paramètres</a></li>
      <li><a routerLink="quiz-result">Quiz — résultat</a></li>
      <li><a routerLink="lp-button">LpButton</a></li>
      <li><a routerLink="lp-dialog">LpDialog</a></li>
      <li><a routerLink="lp-update-dialog">Mise à jour de l’application</a></li>
      <li><a routerLink="lp-release-notes-dialog">Nouveautés des versions</a></li>
      <li><a routerLink="lp-card">LpCard</a></li>
      <li><a routerLink="lp-panel">LpPanel</a></li>
      <li><a routerLink="lp-cryptogram-cell">LpCryptogramCell</a></li>
      <li><a routerLink="lp-cipher-table">LpCipherTable</a></li>
      <li><a routerLink="lp-cryptogram-deck">LpCryptogramDeck</a></li>
      <li><a routerLink="lp-cryptogram-hand">LpCryptogramHand</a></li>
      <li><a routerLink="lp-error-counter">LpErrorCounter</a></li>
      <li><a routerLink="lp-cryptogram-grid">LpCryptogramGrid</a></li>
      <li><a routerLink="lp-game-page">LpGamePage</a></li>
      <li><a routerLink="lp-game-toolbar">LpGameToolbar</a></li>
      <li><a routerLink="lp-player-setup">LpPlayerSetup</a></li>
      <li><a routerLink="lp-scoreboard">LpScoreboard</a></li>
      <li><a routerLink="lp-word-progress">LpWordProgress</a></li>
      <li><a routerLink="lp-letter-keyboard">LpLetterKeyboard</a></li>
      <li><a routerLink="lp-turn-dialog">LpTurnDialog</a></li>
      <li><a routerLink="lp-dictionary-credits">LpDictionaryCredits</a></li>
    </ul>
  `,
})
export class DevHomePage {}
