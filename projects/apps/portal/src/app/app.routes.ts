import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home-page').then((m) => m.HomePage) },
  {
    path: 'cryptogramme',
    loadChildren: () => import('@lets-ple/cryptogramme').then((m) => m.CRYPTOGRAMME_ROUTES),
  },
];
