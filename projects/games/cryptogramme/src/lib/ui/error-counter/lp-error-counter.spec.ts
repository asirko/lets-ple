import { TestBed } from '@angular/core/testing';
import { LpErrorCounter } from './lp-error-counter';

describe('LpErrorCounter', () => {
  it('conserve tous les cœurs et superpose une croix à chaque vie perdue', () => {
    const fixture = TestBed.createComponent(LpErrorCounter);
    fixture.componentRef.setInput('errors', 2);
    fixture.componentRef.setInput('maxErrors', 3);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const hearts = element.querySelectorAll('.crypto-error-heart');
    expect(hearts).toHaveLength(3);
    expect([...hearts].every((heart) => heart.textContent?.includes('♥'))).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.crypto-error-cross')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('[role="group"]').getAttribute('aria-label'))
      .toBe('1 vie restante, 2 erreurs sur 3');

    fixture.componentRef.setInput('errors', 0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.crypto-error-cross')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('[role="group"]').getAttribute('aria-label'))
      .toBe('3 vies restantes, 0 erreur sur 3');
  });
});
