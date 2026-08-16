import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dev-home/dev-home-page').then((m) => m.DevHomePage) },
  { path: 'style', loadComponent: () => import('./style-guide/style-guide-page').then((m) => m.StyleGuidePage) },
];
