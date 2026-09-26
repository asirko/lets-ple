import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import type { Question } from '../../domain/types';
import { LpQuizQuestion } from './question';

const example: Question = {
  id: 'example',
  type: 'capital',
  answerType: 'capital',
  countryCode: 'JPN',
  correctAnswers: ['tokyo'],
  promptKey: 'quiz.prompt.capital',
  promptParams: { country: 'Japon' },
  data: { kind: 'text' },
};

@Component({
  selector: 'lp-quiz-question-showcase',
  imports: [LpQuizQuestion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss'],
  template: `<lp-quiz-question [question]="question()" [number]="4" [score]="11" />`,
})
export class QuizQuestionShowcase {
  readonly question = input.required<Question>();
}
export const QUIZ_QUESTION_SHOWCASE: ComponentShowcase<QuizQuestionShowcase> = {
  component: QuizQuestionShowcase,
  controls: {
    question: {
      kind: 'preset',
      default: 'Capitale',
      options: {
        Capitale: () => example,
        Voisins: () => ({
          ...example,
          type: 'neighbors',
          promptKey: 'quiz.prompt.neighbors',
          data: {
            kind: 'neighbors',
            names: [
              'Belgique',
              'Allemagne',
              'Suisse',
              'Italie',
              'Espagne',
              'Andorre',
              'Monaco',
              'Brésil',
              'Suriname',
            ],
          },
        }),
        Silhouette: () => ({
          ...example,
          type: 'silhouette',
          promptKey: 'quiz.prompt.silhouette',
          data: {
            kind: 'silhouette',
            geometry: {
              type: 'MultiPolygon',
              coordinates: [
                [
                  [
                    [0, 0],
                    [3, 1],
                    [2, 4],
                    [0, 3],
                    [0, 0],
                  ],
                ],
                [
                  [
                    [4, 0],
                    [5, 1],
                    [4, 1],
                    [4, 0],
                  ],
                ],
              ],
            },
          },
        }),
      },
    },
  },
};
