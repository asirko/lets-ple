import { TestBed } from '@angular/core/testing';
import { LpLoader } from './lp-loader';

describe('LpLoader', () => {
  function render(label: string) {
    const f = TestBed.createComponent(LpLoader);
    f.componentRef.setInput('label', label);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('annonce un statut avec le libellé passé', () => {
    const el = render('Chargement…');
    expect(el.querySelector('.loader')?.getAttribute('role')).toBe('status');
    expect(el.querySelector('.loader-label')?.textContent?.trim()).toBe('Chargement…');
  });

  it('affiche la pastille du logo', () => {
    const el = render('Chargement…');
    expect(el.querySelector('lp-logo.loader-mark')).not.toBeNull();
  });

  it("rend la pastille décorative pour n'annoncer que le libellé", () => {
    const el = render('Chargement…');
    expect(el.querySelector('lp-logo.loader-mark')?.getAttribute('aria-hidden')).toBe('true');
  });
});
