import { TestBed } from '@angular/core/testing';
import { LpCountryGlobe } from './country-globe';
import type { Country } from '../../domain/types';
export const france: Country = {
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
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 44],
        [5, 44],
        [5, 49],
        [0, 49],
        [0, 44],
      ],
    ],
  },
};
describe('country globe', () => {
  function setup(country: Country = france) {
    const f = TestBed.createComponent(LpCountryGlobe);
    f.componentRef.setInput('country', country);
    f.componentRef.setInput('countries', [country]);
    f.componentRef.setInput('staticOnly', true);
    f.detectChanges();
    return f;
  }
  it('montre un globe SVG centre sur le pays et son nom sans WebGL', () => {
    const f = setup();
    expect(f.nativeElement.querySelector('svg')).not.toBeNull();
    expect(f.nativeElement.querySelector('path')?.getAttribute('d')).toContain('M');
    expect(f.nativeElement.textContent).toContain('France');
    expect(f.nativeElement.querySelector('canvas')).toBeNull();
  });
  it('decrit la geometrie absente sans inventer une localisation', () => {
    const f = setup({ ...france, geometry: undefined });
    expect(f.nativeElement.textContent).toContain('Localisation indisponible');
    expect(f.nativeElement.querySelector('svg')).toBeNull();
  });
  it('limite les commandes au recentrage et a une aide contextuelle', () => {
    const f = setup();
    const buttons = f.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Recentrer sur la solution');
    expect(buttons[1].textContent.trim()).toBe('?');
    expect(f.nativeElement.querySelector('details')).toBeNull();
    const tooltip = f.nativeElement.querySelector('[role="tooltip"]');
    expect(tooltip.hidden).toBe(true);
    buttons[1].dispatchEvent(new FocusEvent('focus'));
    f.detectChanges();
    expect(tooltip.hidden).toBe(false);
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(tooltip.hidden).toBe(true);
    f.nativeElement
      .querySelector('.quiz-globe-help-anchor')
      .dispatchEvent(new Event('pointerenter'));
    f.detectChanges();
    expect(tooltip.hidden).toBe(true);
  });
  it('ferme aussi l aide survolee avec Echappement sans focus sur le bouton', () => {
    const f = setup();
    const anchor = f.nativeElement.querySelector('.quiz-globe-help-anchor');
    anchor.dispatchEvent(new Event('pointerenter'));
    f.detectChanges();
    const tooltip = f.nativeElement.querySelector('[role="tooltip"]');
    expect(tooltip.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(tooltip.hidden).toBe(true);
    anchor.dispatchEvent(new Event('pointerleave'));
    f.detectChanges();
    expect(tooltip.hidden).toBe(true);
  });
  it('nomme le pays du globe dans son alternative accessible', () => {
    const f = setup();
    expect(f.nativeElement.querySelector('svg')?.getAttribute('aria-label')).toContain('France');
  });
});
