import { TestBed } from '@angular/core/testing';
import { LpCashAnswer } from './cash-answer';

describe('Cash autocomplete', () => {
  async function setup() {
    const fixture = TestBed.createComponent(LpCashAnswer);
    fixture.componentRef.setInput('domain', [
      { id: 'CIV', label: 'Côte d’Ivoire', aliases: [], countryCodes: ['CIV'] },
      { id: 'FRA', label: 'France', aliases: [], countryCodes: ['FRA'] },
    ]);
    fixture.componentRef.setInput('answerType', 'country');
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  it('cache les suggestions à vide, filtre sans accents et sélectionne au clavier', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    expect(el.querySelectorAll('[role=option]').length).toBe(0);
    input.value = 'cote divoire';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelector('[role=option]')?.textContent).toContain('Côte d’Ivoire');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(input.value).toBe('Côte d’Ivoire');
    const received: string[] = [];
    fixture.componentInstance.answered.subscribe((value) => received.push(value));
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(received).toEqual(['Côte d’Ivoire']);
  });
  it('garde une faute dans le champ et explique le domaine attendu', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'Frannce';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('pays');
  });
  it('active le dernier résultat avec Flèche haut depuis la saisie', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    input.value = 'r';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('[role=option][aria-selected=true]')?.textContent?.trim()).toBe(
      'France',
    );
  });
});
