import type { Routes } from '@angular/router';

export const DERNIER_MOT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/game-route/lp-dernier-mot-game-route').then((m) => m.LpDernierMotGameRoute),
  },
];
