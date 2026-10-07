import { TestBed } from '@angular/core/testing';
import { LpQuizAnswers } from './answers';
import type { Mode } from '../../domain/types';
import type { GameState } from '../../domain/game';

describe('Choix du mode Quiz', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('propose seulement Cash et Carré et émet leur sélection', async () => {
    const fixture = TestBed.createComponent(LpQuizAnswers);
    const state: GameState = {
      questions: [],
      index: 0,
      phase: 'choosing',
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      mode: null,
      options: [],
      submittedAnswer: null,
      correct: null,
      awarded: 0,
    };
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('domain', []);
    fixture.componentRef.setInput('answerType', 'country');
    fixture.componentRef.setInput('correctLabels', []);
    fixture.detectChanges();
    await fixture.whenStable();
    const buttons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.quiz-mode'),
    ];
    expect(buttons).toHaveLength(2);
    expect(buttons.map((button) => button.querySelector('strong')?.textContent?.trim())).toEqual([
      'CASH',
      'CARRÉ',
    ]);
    expect(buttons[0].textContent).toContain('5 pts');
    expect(buttons[1].textContent).toContain('3 pts');
    const selected: Mode[] = [];
    fixture.componentInstance.modeChosen.subscribe((mode) => selected.push(mode));
    buttons.forEach((button) => button.click());
    expect(selected).toEqual(['cash', 'carre']);
  });
});
