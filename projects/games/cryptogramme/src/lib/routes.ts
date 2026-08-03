import type { Routes } from '@angular/router';

/**
 * Routes du jeu cryptogramme, à monter par l'app hôte (le portail — tâche 17, pas encore câblée).
 *
 * `loadComponent` charge `LpGamePage` en lazy : c'est ce composant qui référence
 * `_cryptogramme.scss` (voir son en-tête), donc le style du jeu part dans ce même chunk et n'est
 * jamais tiré dans le bundle initial du portail.
 */
export const CRYPTOGRAMME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ui/game-page/lp-game-page').then((m) => m.LpGamePage),
  },
];
