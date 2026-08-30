import { TestBed } from '@angular/core/testing';
import { LpPlayerSetup } from './lp-player-setup';

describe('LpPlayerSetup', () => {
  it('désactive le départ avec moins de deux joueurs', () => {
    const fixture = TestBed.createComponent(LpPlayerSetup);
    fixture.componentRef.setInput('names', ['Alice']);
    fixture.detectChanges();

    expect(startButton(fixture.nativeElement).disabled).toBe(true);
  });

  it('refuse un pseudonyme déjà pris sans tenir compte de la casse', () => {
    const fixture = TestBed.createComponent(LpPlayerSetup);
    fixture.componentRef.setInput('names', ['Alice']);
    fixture.detectChanges();

    enterName(fixture.nativeElement, '  ALICE  ');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'déjà utilisé',
    );
    expect(addButton(fixture.nativeElement).disabled).toBe(true);
  });

  it('émet uniquement les noms non vides, nettoyés et uniques', () => {
    const fixture = TestBed.createComponent(LpPlayerSetup);
    fixture.componentRef.setInput('names', ['Alice']);
    const emitted: (readonly string[])[] = [];
    fixture.componentInstance.playersSubmitted.subscribe((names) => emitted.push(names));
    fixture.detectChanges();

    enterName(fixture.nativeElement, '  Bob  ');
    fixture.detectChanges();
    startButton(fixture.nativeElement).click();

    expect(emitted).toEqual([['Alice', 'Bob']]);
  });
});

function enterName(root: HTMLElement, value: string): void {
  const input = root.querySelector('[data-player-name]') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function addButton(root: HTMLElement): HTMLButtonElement {
  return root.querySelector('[data-add-player]') as HTMLButtonElement;
}

function startButton(root: HTMLElement): HTMLButtonElement {
  return root.querySelector('[data-start-game]') as HTMLButtonElement;
}
