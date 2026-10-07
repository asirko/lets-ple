import { Routes } from '@angular/router';

export const DEV_ROUTES: Routes = [
  {
    path: 'quiz-knowledge-globe',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/knowledge-globe/knowledge-globe.showcase').then(
          (m) => m.LPKNOWLEDGEGLOBE_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-clear-history-dialog',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/clear-history-dialog/clear-history-dialog.showcase').then(
          (m) => m.LPCLEARHISTORYDIALOG_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-history-status',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/history-status/history-status.showcase').then(
          (m) => m.LPHISTORYSTATUS_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-empty-history',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/empty-history/empty-history.showcase').then(
          (m) => m.LPEMPTYHISTORY_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-knowledge-legend',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/knowledge-legend/knowledge-legend.showcase').then(
          (m) => m.LPKNOWLEDGELEGEND_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-country-detail',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/country-detail/country-detail.showcase').then(
          (m) => m.LPCOUNTRYDETAIL_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-country-list',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/country-list/country-list.showcase').then(
          (m) => m.LPCOUNTRYLIST_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-type-breakdown',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/type-breakdown/type-breakdown.showcase').then(
          (m) => m.LPTYPEBREAKDOWN_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-weekly-trend',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/weekly-trend/weekly-trend.showcase').then(
          (m) => m.LPWEEKLYTREND_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-continent-focus',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/continent-focus/continent-focus.showcase').then(
          (m) => m.LPCONTINENTFOCUS_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-statistics-summary',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: {
      loadShowcase: () =>
        import('../../../../../games/quiz/src/lib/ui/statistics-summary/statistics-summary.showcase').then(
          (m) => m.LPSTATISTICSSUMMARY_SHOWCASE,
        ),
    },
  },
  {
    path: 'quiz-silhouettes-selection',
    loadComponent: () => import('@lets-ple/quiz').then((m) => m.SilhouetteReviewPage),
    data: { focused: true },
  },
  {
    path: 'quiz-silhouettes',
    loadComponent: () => import('@lets-ple/quiz').then((m) => m.SilhouetteReviewPage),
  },
  {
    path: 'lp-home-concept',
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: { loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_HOME_CONCEPT_SHOWCASE) },
  },
  ...[
    { path: 'quiz-correction', loadShowcase: () => import('@lets-ple/quiz').then(m => m.QUIZ_CORRECTION_SHOWCASE) },
    { path: 'quiz-globe', loadShowcase: () => import('@lets-ple/quiz').then(m => m.QUIZ_GLOBE_SHOWCASE) },
    {
      path: 'lp-update-dialog',
      loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_UPDATE_DIALOG_SHOWCASE),
    },
    {
      path: 'lp-release-notes-dialog',
      loadShowcase: () => import('@lets-ple/ui').then((m) => m.LP_RELEASE_NOTES_DIALOG_SHOWCASE),
    },
    {
      path: 'quiz-toolbar',
      loadShowcase: () => import('@lets-ple/quiz').then((m) => m.QUIZ_TOOLBAR_SHOWCASE),
    },
    {
      path: 'quiz-question',
      loadShowcase: () => import('@lets-ple/quiz').then((m) => m.QUIZ_QUESTION_SHOWCASE),
    },
    {
      path: 'quiz-cash',
      loadShowcase: () => import('@lets-ple/quiz').then((m) => m.CASH_ANSWER_SHOWCASE),
    },
    {
      path: 'quiz-answers',
      loadShowcase: () => import('@lets-ple/quiz').then((m) => m.QUIZ_ANSWERS_SHOWCASE),
    },
    {
      path: 'quiz-result',
      loadShowcase: () => import('@lets-ple/quiz').then((m) => m.QUIZ_RESULT_SHOWCASE),
    },
  ].map(({ path, loadShowcase }) => ({
    path,
    loadComponent: () => import('./component-page/component-page').then((m) => m.ComponentPage),
    data: { loadShowcase },
  })),
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
