import { TestBed } from '@angular/core/testing';
import { LpButton } from './lp-button';

describe('LpButton', () => {
  it('pose uniquement .b-ghost pour la variante ghost', () => {
    const fixture = TestBed.createComponent(LpButton);
    fixture.componentRef.setInput('variant', 'ghost');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('b-button')).toBe(true);
    expect(button.classList.contains('b-ghost')).toBe(true);
    expect(button.classList.contains('b-primary')).toBe(false);
    expect(button.classList.contains('b-secondary')).toBe(false);
  });
});
