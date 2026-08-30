import { TestBed } from '@angular/core/testing';
import { LpWordProgress } from './lp-word-progress';

describe('LpWordProgress', () => {
  it('guide le premier joueur quand le préfixe est vide', () => {
    const fixture = TestBed.createComponent(LpWordProgress);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choisissez la première lettre');
  });

  it('annonce séparément un mot intermédiaire et ses prolongements', () => {
    const fixture = TestBed.createComponent(LpWordProgress);
    fixture.componentRef.setInput('prefix', 'CHAT');
    fixture.componentRef.setInput('isWord', true);
    fixture.componentRef.setInput('continuationCount', 12);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mot valide');
    expect(fixture.nativeElement.textContent).toContain('12 prolongements possibles');
  });

  it('annonce un mot terminal sans prolongement', () => {
    const fixture = TestBed.createComponent(LpWordProgress);
    fixture.componentRef.setInput('prefix', 'ZYGOTE');
    fixture.componentRef.setInput('isWord', true);
    fixture.componentRef.setInput('continuationCount', 0);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mot terminal');
    expect(fixture.nativeElement.textContent).not.toContain('prolongements possibles');
  });
});
