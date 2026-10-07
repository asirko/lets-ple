import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpCashAnswer } from './cash-answer';

@Component({
  selector: 'lp-cash-answer-showcase',
  imports: [LpCashAnswer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_quiz.scss'],
  template: `<lp-cash-answer [domain]="domain" answerType="country" />`,
})
export class CashAnswerShowcase {
  readonly domain = [
    { id: 'CIV', label: 'Côte d’Ivoire', aliases: [], countryCodes: ['CIV'] },
    { id: 'FRA', label: 'France', aliases: [], countryCodes: ['FRA'] },
    ...Array.from({ length: 30 }, (_, i) => ({
      id: 'demo-' + i,
      label: 'Pays de démonstration avec un nom long ' + (i + 1),
      aliases: [],
      countryCodes: [],
    })),
    { id: 'STP', label: 'São Tomé-et-Príncipe', aliases: [], countryCodes: ['STP'] },
  ];
}
export const CASH_ANSWER_SHOWCASE: ComponentShowcase<CashAnswerShowcase> = {
  component: CashAnswerShowcase,
  controls: {},
};
