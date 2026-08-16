import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dev-home/dev-home-page').then((m) => m.DevHomePage) },
  { path: 'style', loadComponent: () => import('./style-guide/style-guide-page').then((m) => m.StyleGuidePage) },
  {
    path: 'lp-button',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_BUTTON_SHOWCASE) },
  },
  {
    path: 'lp-card',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_CARD_SHOWCASE) },
  },
  {
    path: 'lp-panel',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_PANEL_SHOWCASE) },
  },
  {
    path: 'lp-cryptogram-cell',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_CELL_SHOWCASE),
    },
  },
];
