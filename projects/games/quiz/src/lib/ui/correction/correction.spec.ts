import { TestBed } from '@angular/core/testing';
import { LpQuizCorrection } from './correction';
import type { Country, Question } from '../../domain/types';
import type { GameState } from '../../domain/game';
const france: Country = {
  iso2: 'FR',
  iso3: 'FRA',
  name: 'France',
  aliases: [],
  capitals: ['Paris'],
  capitalAliases: {},
  continent: 'Europe',
  subregion: 'Western Europe',
  borders: [],
  flag: 'content/geography/flags/test.svg',
  flagEligible: true,
  capitalEligible: true,
};
const q: Question = {
  id: 'capital:FRA',
  type: 'capital',
  countryCode: 'FRA',
  promptKey: 'quiz.prompt.capital',
  promptParams: { country: 'France' },
  answerType: 'capital',
  correctAnswers: ['paris'],
  data: { kind: 'text' },
};
const state: GameState = {
  questions: [q, q],
  index: 0,
  phase: 'correction',
  score: 0,
  correctCount: 0,
  wrongCount: 1,
  mode: 'carre',
  options: [],
  submittedAnswer: 'Rome',
  correct: false,
  awarded: 0,
};
describe('quiz correction', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });
  function setup(s: GameState = state, c: Country = france) {
    const f = TestBed.createComponent(LpQuizCorrection);
    f.componentRef.setInput('state', s);
    f.componentRef.setInput('country', c);
    f.componentRef.setInput('countries', [c]);
    f.componentRef.setInput('correctLabels', c.capitals);
    f.componentRef.setInput('staticGlobe', true);
    f.detectChanges();
    return f;
  }
  it('ouvre une correction incorrecte avec reponse donnee, bonne reponse et points', () => {
    const f = setup();
    expect(f.nativeElement.querySelector('dialog')?.open).toBe(true);
    const text = f.nativeElement.textContent;
    expect(text).toContain('Mauvaise réponse');
    expect(text).toContain('Rome');
    expect(text).toContain('Paris');
    expect(text).toContain('0 points obtenus');
  });
  it('affiche une bonne reponse et les points du moteur', () => {
    const f = setup({ ...state, correct: true, awarded: 5, submittedAnswer: 'Paris' });
    expect(f.nativeElement.textContent).toContain('Bonne réponse');
    expect(f.nativeElement.textContent).toContain('5 points obtenus');
  });
  it('affiche toutes les capitales et les voisins connus', () => {
    const c = {
      ...france,
      name: 'Afrique du Sud',
      capitals: ['Pretoria', 'Bloemfontein', 'Le Cap'],
      borders: ['FRA'],
    };
    const f = setup(state, c);
    expect(f.nativeElement.textContent).toContain('Pretoria / Bloemfontein / Le Cap');
    expect(f.nativeElement.textContent).toContain('Afrique du Sud');
  });
  it('emet la progression explicite et adapte la derniere question a la longueur reelle', () => {
    const f = setup({ ...state, index: 1 });
    let count = 0;
    f.componentInstance.next.subscribe(() => count++);
    const button = f.nativeElement.querySelector('.dialog-actions button');
    expect(button?.textContent).toContain('Voir le résultat');
    button?.click();
    expect(count).toBe(1);
  });
  it('conserve la correction sur Echap et le focus initial sur la progression', () => {
    const f = setup();
    const d: HTMLDialogElement = f.nativeElement.querySelector('dialog');
    const cancel = new Event('cancel', { cancelable: true });
    d?.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(f.nativeElement.querySelector('.dialog-actions button'));
  });
  it('qualifie les capitales et drapeaux exclus au lieu de les affirmer', () => {
    const f = setup(state, { ...france, capitalEligible: false, flagEligible: false });
    expect(f.nativeElement.textContent).toContain('Villes de référence du corpus');
    expect(f.nativeElement.textContent).toContain('statut de capitale');
    expect(f.nativeElement.textContent).toContain('Drapeau du corpus');
  });
  it('ne monte ni correction ni globe avant soumission', () => {
    const f = setup({ ...state, phase: 'answering' });
    expect(f.nativeElement.querySelector('dialog')).toBeNull();
    expect(f.nativeElement.querySelector('lp-country-globe')).toBeNull();
  });
});
