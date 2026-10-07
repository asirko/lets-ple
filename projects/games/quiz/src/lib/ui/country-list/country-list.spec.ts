import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { LpCountryList } from './country-list';
import { STATISTICS_PREVIEW } from '../statistics-preview';
describe('country navigation', () => {
  it('searches accents and emits a country selection', () => {
    const f = TestBed.createComponent(LpCountryList);
    f.componentRef.setInput('labels', {
      countries: 'Pays',
      search: 'Rechercher',
      sort: 'Tri',
      sortName: 'Nom',
      sortScore: 'Score',
      answers: 'Réponses',
      points: 'pts',
      na: 'N.A.',
    });
    f.componentRef.setInput('rows', STATISTICS_PREVIEW.rows);
    f.detectChanges();
    let selected = '';
    f.componentInstance.selectedCountry.subscribe((v) => (selected = v));
    const buttons = f.nativeElement.querySelectorAll('.quiz-stats-country');
    expect(buttons.length).toBe(2);
    buttons[0].click();
    expect(selected).toBe('FJI');
    f.componentInstance.search.set('france');
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.quiz-stats-country').length).toBe(1);
  });
});
