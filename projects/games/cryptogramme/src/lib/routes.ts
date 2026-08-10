import type { Routes } from '@angular/router';

/**
 * Routes du jeu cryptogramme, montées par le portail sous `/cryptogramme` (voir
 * `projects/apps/portal/src/app/app.routes.ts`).
 *
 * `loadComponent` charge `LpGameRoute` en lazy, qui importe à son tour `LpGamePage` : c'est ce
 * dernier qui référence `_cryptogramme.scss` (voir son en-tête), donc le style du jeu part dans ce
 * même chunk et n'est jamais tiré dans le bundle initial du portail — le niveau d'indirection
 * supplémentaire ne change rien au découpage, `loadComponent` embarque tout ce qu'importe
 * transitivement le composant chargé.
 */
export const CRYPTOGRAMME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ui/game-route/lp-game-route').then((m) => m.LpGameRoute),
  },
];
