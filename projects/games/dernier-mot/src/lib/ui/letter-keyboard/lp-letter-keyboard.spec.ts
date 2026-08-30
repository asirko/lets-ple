import { TestBed } from '@angular/core/testing';
import { LpLetterKeyboard } from './lp-letter-keyboard';

describe('LpLetterKeyboard', () => {
  it('n’émet qu’une lettre A-Z', () => {
    const fixture = TestBed.createComponent(LpLetterKeyboard);
    const emitted: string[] = [];
    fixture.componentInstance.letterSelected.subscribe((letter) => emitted.push(letter));
    fixture.detectChanges();

    fixture.componentInstance.selectLetter('É');
    expect(emitted).toEqual([]);
    clickKey(fixture.nativeElement, 'E');
    expect(emitted).toEqual(['E']);
  });

  it('bloque toutes les touches pendant une transition', () => {
    const fixture = TestBed.createComponent(LpLetterKeyboard);
    fixture.componentRef.setInput('disabled', true);
    const emitted: string[] = [];
    fixture.componentInstance.letterSelected.subscribe((letter) => emitted.push(letter));
    fixture.detectChanges();

    clickKey(fixture.nativeElement, 'A');

    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('button:disabled')).toHaveLength(26);
  });
});

function clickKey(root: HTMLElement, letter: string): void {
  (root.querySelector(`[data-letter="${letter}"]`) as HTMLButtonElement).click();
}
