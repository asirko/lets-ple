import { inject } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { Routes } from '@angular/router';
export const QUIZ_ROUTES: Routes = [
  {
    path: 'statistiques',
    data: { preload: true },
    title: () => inject(I18nService).t('quiz.stats.title'),
    loadComponent: () =>
      import('./ui/statistics-route/quiz-statistics-page').then((m) => m.QuizStatisticsPage),
  },
  {
    path: '',
    pathMatch: 'full',
    data: { preload: true },
    loadComponent: () => import('./ui/game-route/quiz-page').then((m) => m.QuizPage),
  },
];
