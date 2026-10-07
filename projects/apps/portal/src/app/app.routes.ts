import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'quiz',
    data: { preload: true },
    loadChildren: () => import('@lets-ple/quiz').then((m) => m.QUIZ_ROUTES),
  },
  {
    path: '',
    data: { preload: true },
    loadComponent: () => import('./home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'cryptogramme',
    data: { preload: true },
    loadChildren: () => import('@lets-ple/cryptogramme').then((m) => m.CRYPTOGRAMME_ROUTES),
  },
  {
    path: 'dernier-mot',
    data: { preload: true },
    loadChildren: () => import('@lets-ple/dernier-mot').then((m) => m.DERNIER_MOT_ROUTES),
  },
  {
    path: 'dev/components',
    data: { preload: false },
    loadChildren: () => import('./dev/dev.routes').then((m) => m.DEV_ROUTES),
  },
];
