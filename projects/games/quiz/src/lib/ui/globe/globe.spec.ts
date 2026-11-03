import { TestBed } from '@angular/core/testing';
import { LpGlobe } from './globe';
import type { Geometry } from '../../domain/types';
const shape: Geometry = {
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
};
describe('globe', () => {
  function setup(fallbackShape: Geometry | null) {
    const f = TestBed.createComponent(LpGlobe);
    f.componentRef.setInput('places', [{ iso3: 'FRA', name: 'France', anchor: [2.5, 46.5] }]);
    f.componentRef.setInput('label', 'Globe centré sur France');
    f.componentRef.setInput('staticOnly', true);
    f.componentRef.setInput('fallbackShape', fallbackShape);
    f.detectChanges();
    return f;
  }
  it('dessine la vue statique du pays sans WebGL', () => {
    const f = setup(shape);
    const svg = f.nativeElement.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Globe centré sur France');
    expect(f.nativeElement.querySelector('path')?.getAttribute('d')).toContain('M');
    expect(f.nativeElement.querySelector('canvas')).toBeNull();
  });
  it('ne dessine rien sans forme de repli', () => {
    const f = setup(null);
    expect(f.nativeElement.querySelector('svg')).toBeNull();
  });
  it('ne porte ni titre ni bouton', () => {
    const f = setup(shape);
    expect(f.nativeElement.querySelector('button, h2, h3, figcaption')).toBeNull();
  });
  it('accepte un recentrage avant que le rendu soit pret', () => {
    const f = setup(shape);
    expect(() => f.componentInstance.centerOn('FRA')).not.toThrow();
  });
});
