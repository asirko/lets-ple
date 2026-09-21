import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LpGameToolbar } from './lp-game-toolbar';

describe('LpGameToolbar', () => {
  let fixture: ComponentFixture<LpGameToolbar>;

  beforeEach(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
      HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    }
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(LpGameToolbar);
    for (const [key, value] of Object.entries({ known: new Map([[1, 'A']]), errors: 0,
      maxErrors: 3, remaining: 8, handFull: false, hand: ['B'] })) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  });

  it('garde la correspondance visible et place le retour aux jeux dans le bandeau', () => {
    expect(fixture.nativeElement.querySelector('lp-cipher-table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-action="cipher"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[aria-label="Retour aux jeux"]').getAttribute('href')).toBe('/');
    expect(fixture.nativeElement.querySelector('summary').getAttribute('aria-label')).toBe('Menu du cryptogramme');
  });

  it('distingue recommencer de choisir une nouvelle citation', () => {
    const restart = vi.fn();
    const newGame = vi.fn();
    fixture.componentInstance.restart.subscribe(restart);
    fixture.componentInstance.newGame.subscribe(newGame);
    fixture.nativeElement.querySelector('[data-action="restart"]').click();
    expect(restart).toHaveBeenCalledOnce();
    expect(newGame).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[data-action="new-game"]').click();
    expect(newGame).toHaveBeenCalledOnce();
  });

  it('ferme le menu au clic extérieur sans déplacer le focus', () => {
    const menu = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    menu.open = true;
    const deck = fixture.nativeElement.querySelector('.crypto-deck') as HTMLButtonElement;
    deck.focus();
    deck.click();
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(deck);
  });

  it.each(['restart', 'new-game', 'settings', 'rules'])('ferme le menu après %s', (action) => {
    const menu = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    menu.open = true;
    fixture.nativeElement.querySelector(`[data-action="${action}"]`).click();
    expect(menu.open).toBe(false);
  });

  it('affiche les règles dans une modale refermable', () => {
    fixture.nativeElement.querySelector('[data-action="rules"]').click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog[open]') as HTMLDialogElement;
    expect(dialog.textContent).toContain('Règles du jeu');
    expect(dialog.textContent).toContain('double-cliquez');
    dialog.querySelector<HTMLButtonElement>('.dialog-actions button')!.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
  });

  it('ouvre les règles depuis le bouton aide à côté du titre', () => {
    fixture.nativeElement.querySelector('button[aria-label="Règles du jeu"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog[open]')?.textContent).toContain('Règles du jeu');
  });

  it('ouvre les paramètres en modale et conserve la partie en les fermant', () => {
    const newGame = vi.fn();
    fixture.componentInstance.newGame.subscribe(newGame);
    const menu = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    menu.open = true;
    fixture.nativeElement.querySelector('[data-action="settings"]').click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog[open]') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(menu.open).toBe(false);
    dialog.querySelector<HTMLButtonElement>('.dialog-actions button')!.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(newGame).not.toHaveBeenCalled();
  });

  it('émet une borne numérique ou null lorsque le champ est vidé', () => {
    const changed = vi.fn();
    fixture.componentInstance.minLettersChange.subscribe(changed);
    const field = fixture.nativeElement.querySelector('input[name="minLetters"]') as HTMLInputElement;
    field.value = '40';
    field.dispatchEvent(new Event('input'));
    expect(changed).toHaveBeenLastCalledWith(40);
    field.value = '';
    field.dispatchEvent(new Event('input'));
    expect(changed).toHaveBeenLastCalledWith(null);
  });

  it('synchronise les champs et les poignées sans croiser les limites du curseur', () => {
    const minimum = vi.fn();
    const maximum = vi.fn();
    fixture.componentInstance.minLettersChange.subscribe(minimum);
    fixture.componentInstance.maxLettersChange.subscribe(maximum);
    const field = fixture.nativeElement.querySelector('input[name="maxLetters"]') as HTMLInputElement;
    field.value = '80';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const minRange = fixture.nativeElement.querySelector('input[name="minimumRange"]') as HTMLInputElement;
    const maxRange = fixture.nativeElement.querySelector('input[name="maximumRange"]') as HTMLInputElement;
    expect(maxRange.value).toBe('80');
    minRange.value = '100';
    minRange.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(minimum).toHaveBeenLastCalledWith(80);
    expect((fixture.nativeElement.querySelector('input[name="minLetters"]') as HTMLInputElement).value).toBe('80');
    maxRange.value = '20';
    maxRange.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(maximum).toHaveBeenLastCalledWith(80);
  });

  it('communique sa hauteur réelle après le premier rendu pour dégager les cases au focus', async () => {
    const measuredFixture = TestBed.createComponent(LpGameToolbar);
    for (const [key, value] of Object.entries({ known: new Map(), errors: 0,
      maxErrors: 3, remaining: 8, hand: [] })) {
      measuredFixture.componentRef.setInput(key, value);
    }
    const heightChanged = vi.fn();
    measuredFixture.componentInstance.heightChange.subscribe(heightChanged);
    vi.spyOn(measuredFixture.nativeElement as HTMLElement, 'getBoundingClientRect')
      .mockReturnValue({ height: 147.5 } as DOMRect);

    measuredFixture.detectChanges();
    await measuredFixture.whenStable();

    expect(heightChanged).toHaveBeenCalledWith(148);
  });
});
