import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LpDialog } from './lp-dialog';

@Component({
  imports: [LpDialog],
  template: `
    <button type="button" class="outside-action">Ouvrir</button>
    <lp-dialog
      [open]="open()"
      title="Passez le téléphone"
      [closeOnEscape]="closeOnEscape()"
      (dismissed)="dismissed()"
    >
      <div lpDialogBody>
        <p>Le prochain joueur peut commencer.</p>
        <input class="decoy decoy-hidden-input" type="hidden" />
        <button class="decoy decoy-disabled" type="button" disabled>Désactivé</button>
        <button class="decoy decoy-negative" type="button" tabindex="-1">Tabindex négatif</button>
        <button class="decoy decoy-hidden" type="button" hidden>Masqué</button>
        <button class="decoy decoy-inert" type="button" inert>Inerte</button>
        <button class="decoy decoy-not-rendered" type="button" style="display: none">
          Non rendu
        </button>
        <details>
          <summary>Voir la règle</summary>
          <p>Gardez le plateau visible.</p>
        </details>
        <button type="button" class="b-button b-primary body-primary">Action du corps</button>
      </div>
      <div lpDialogActions>
        <button type="button" class="b-button b-secondary">Retour</button>
        <button type="button" class="b-button b-primary">Continuer</button>
      </div>
    </lp-dialog>
  `,
})
class DialogHost {
  readonly open = signal(false);
  readonly closeOnEscape = signal(true);
  readonly dismissed = vi.fn();
}

describe('LpDialog', () => {
  let fixture: ComponentFixture<DialogHost>;

  beforeEach(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }

    fixture = TestBed.createComponent(DialogHost);
    fixture.detectChanges();
  });

  function dialog(): HTMLDialogElement {
    return fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
  }

  function openDialog(): void {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
  }

  it('expose la sémantique modale et relie son nom accessible au titre', () => {
    const element = dialog();
    const title = element.querySelector('h2') as HTMLHeadingElement;

    expect(element.getAttribute('role')).toBe('dialog');
    expect(element.getAttribute('aria-modal')).toBe('true');
    expect(element.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toContain('Passez le téléphone');
  });

  it('utilise des classes de module SMACSS sans suffixes BEM', () => {
    const classes = Array.from(dialog().querySelectorAll<HTMLElement>('[class]')).flatMap(
      (element) => Array.from(element.classList),
    );

    expect(classes.some((className) => className.includes('__'))).toBe(false);
  });

  it("place le focus sur l'action principale à l'ouverture", () => {
    openDialog();

    expect(document.activeElement).toBe(dialog().querySelector('.dialog-actions .b-primary'));
    expect(document.activeElement).not.toBe(dialog().querySelector('.body-primary'));
  });

  it('reboucle Tab du dernier contrôle vers le premier contrôle du corps', () => {
    openDialog();
    const firstControl = dialog().querySelector('summary') as HTMLElement;
    const lastAction = dialog().querySelector('.dialog-actions .b-primary') as HTMLButtonElement;
    lastAction.focus();

    lastAction.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );

    expect(document.activeElement).toBe(firstControl);
  });

  it('reboucle Maj+Tab du premier contrôle du corps vers la dernière action', () => {
    openDialog();
    const firstControl = dialog().querySelector('summary') as HTMLElement;
    const lastAction = dialog().querySelector('.dialog-actions .b-primary') as HTMLButtonElement;
    firstControl.focus();

    firstControl.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );

    expect(document.activeElement).toBe(lastAction);
  });

  it.each([
    ['un input hidden', '.decoy-hidden-input'],
    ['un contrôle disabled', '.decoy-disabled'],
    ["un contrôle portant l'attribut hidden", '.decoy-hidden'],
    ['un contrôle inert', '.decoy-inert'],
    ['un contrôle à tabindex négatif', '.decoy-negative'],
    ['un contrôle non rendu', '.decoy-not-rendered'],
  ])('ignore %s aux deux extrémités de la boucle Tab', (_label, selector) => {
    openDialog();
    const element = dialog();
    const candidate = element.querySelector(selector) as HTMLElement;
    const firstControl = element.querySelector('summary') as HTMLElement;
    const lastAction = element.querySelector('.dialog-actions .b-primary') as HTMLButtonElement;
    element.querySelectorAll<HTMLElement>('.decoy').forEach((decoy) => {
      if (decoy !== candidate) decoy.remove();
    });

    lastAction.focus();
    lastAction.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(firstControl);

    lastAction.after(candidate);
    firstControl.focus();
    firstControl.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(lastAction);
  });

  it('émet dismissed quand Escape est autorisé', () => {
    openDialog();

    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(fixture.componentInstance.dismissed).toHaveBeenCalledOnce();
  });

  it("n'émet pas dismissed et garde la modale ouverte quand Escape est interdit", () => {
    fixture.componentInstance.closeOnEscape.set(false);
    openDialog();
    const cancel = new Event('cancel', { cancelable: true });

    dialog().dispatchEvent(cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.dismissed).not.toHaveBeenCalled();
    expect(dialog().open).toBe(true);
  });

  it("émet dismissed après une fermeture native indépendante tant que l'input open reste vrai", () => {
    openDialog();

    dialog().close();

    expect(fixture.componentInstance.open()).toBe(true);
    expect(fixture.componentInstance.dismissed).toHaveBeenCalledOnce();
  });

  it('rend le focus à l’élément actif avant l’ouverture après la fermeture', () => {
    const trigger = fixture.nativeElement.querySelector('.outside-action') as HTMLButtonElement;
    trigger.focus();
    openDialog();

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger);
  });
});
