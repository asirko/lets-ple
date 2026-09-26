import type { Routes } from '@angular/router';
export const QUIZ_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./ui/game-route/quiz-page').then((m) => m.QuizPage) },
];
