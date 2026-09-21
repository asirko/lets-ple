import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dev-home/dev-home-page').then((m) => m.DevHomePage) },
  {
    path: 'style',
    loadComponent: () => import('./style-guide/style-guide-page').then((m) => m.StyleGuidePage),
  },
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
    path: 'lp-dialog',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_DIALOG_SHOWCASE) },
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
      loadShowcase: () =>
        import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_CELL_SHOWCASE),
    },
  },
  {
    path: 'lp-cipher-table',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_CIPHER_TABLE_SHOWCASE),
    },
  },
  {
    path: 'lp-cryptogram-deck',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_DECK_SHOWCASE),
    },
  },
  {
    path: 'lp-cryptogram-hand',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_HAND_SHOWCASE),
    },
  },
  {
    path: 'lp-error-counter',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_ERROR_COUNTER_SHOWCASE),
    },
  },
  {
    path: 'lp-cryptogram-grid',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('@lets-ple/cryptogramme').then((m) => m.LP_CRYPTOGRAM_GRID_SHOWCASE),
    },
  },
  {
    path: 'lp-game-toolbar',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_GAME_TOOLBAR_SHOWCASE),
    },
  },
  {
    path: 'lp-game-page',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/cryptogramme').then((m) => m.LP_GAME_PAGE_SHOWCASE),
    },
  },
  {
    path: 'lp-player-setup',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/dernier-mot').then((m) => m.LP_PLAYER_SETUP_SHOWCASE),
    },
  },
  {
    path: 'lp-scoreboard',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/dernier-mot').then((m) => m.LP_SCOREBOARD_SHOWCASE),
    },
  },
  {
    path: 'lp-word-progress',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/dernier-mot').then((m) => m.LP_WORD_PROGRESS_SHOWCASE),
    },
  },
  {
    path: 'lp-letter-keyboard',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('@lets-ple/dernier-mot').then((m) => m.LP_LETTER_KEYBOARD_SHOWCASE),
    },
  },
  {
    path: 'lp-turn-dialog',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () => import('@lets-ple/dernier-mot').then((m) => m.LP_TURN_DIALOG_SHOWCASE),
    },
  },
  {
    path: 'lp-dictionary-credits',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('@lets-ple/dernier-mot').then((m) => m.LP_DICTIONARY_CREDITS_SHOWCASE),
    },
  },
];
