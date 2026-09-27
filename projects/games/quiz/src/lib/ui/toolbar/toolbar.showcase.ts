import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { normalizePreferences } from '../../domain/preferences';
import { LpQuizToolbar } from './toolbar';

@Component({
  selector: 'lp-quiz-toolbar-showcase',
  imports: [LpQuizToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss'],
  template: `<lp-quiz-toolbar
    [preferences]="preferences()"
    (settingsSaved)="preferences.set($event)"
  />`,
})
export class QuizToolbarShowcase {
  readonly preferences = signal(normalizePreferences(null));
}
export const QUIZ_TOOLBAR_SHOWCASE: ComponentShowcase<QuizToolbarShowcase> = {
  component: QuizToolbarShowcase,
  controls: {},
};
