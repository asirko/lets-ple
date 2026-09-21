import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LpGamePage } from './lp-game-page';
import { GameStore } from '../../store/game.store';

describe('LpGamePage completion', () => {
  function setup(text = 'ABCD ABCD ABCD ABCD') {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close ??= function () { this.removeAttribute('open'); };
    const fixture = TestBed.createComponent(LpGamePage);
    for (const [key, value] of Object.entries({ quoteId: 'test', text, author: 'Auteur', source: 'Source', seed: 'test' })) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    const store = (fixture.componentInstance as unknown as { store: GameStore }).store;
    return { fixture, store };
  }

  it('félicite dès la dernière correspondance et complète les cases à la fermeture', () => {
    const { fixture, store } = setup();
    expect(fixture.nativeElement.querySelector('dialog[open]')).toBeNull();
    store.draw();
    const index = store.state().board.findIndex((cell, i) => cell.kind === 'letter' && cell.filled === null && store.state().puzzle.solution[i] === store.topCard());
    store.selectCell(index);
    store.play();
    fixture.detectChanges();
    expect(store.state().status).toBe('playing');
    expect(fixture.nativeElement.querySelector('dialog[open]')).not.toBeNull();
    fixture.nativeElement.querySelector('dialog[open] .b-primary').click();
    fixture.detectChanges();
    expect(store.state().status).toBe('won');
    expect(store.state().deck).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('dialog[open]')).toBeNull();
  });

  it('reconstruit le jeu quand la citation ou la graine change', () => {
    const { fixture, store } = setup();
    fixture.componentRef.setInput('text', 'Une autre citation.');
    fixture.componentRef.setInput('seed', 'nouvelle');
    fixture.detectChanges();
    const next = (fixture.componentInstance as unknown as { store: GameStore }).store;
    expect(next).not.toBe(store);
    expect(next.state().puzzle.text).toBe('Une autre citation.');
    expect(next.state().puzzle.seed).toBe('nouvelle');
  });

  it.each(['won', 'lost'] as const)('propose une nouvelle citation après une partie %s', (status) => {
    const { fixture, store } = setup('ABCDEFG ABCDEFG');
    while (store.state().status === 'playing') {
      if (!store.topCard()) store.draw();
      const index = store.state().board.findIndex((cell, i) => cell.kind === 'letter' && cell.filled === null &&
        (status === 'won' ? store.state().puzzle.solution[i] === store.topCard() : store.state().puzzle.solution[i] !== store.topCard()));
      store.selectCell(index);
      store.play();
    }
    const newGame = vi.fn();
    fixture.componentInstance.newGame.subscribe(newGame);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const button = [...fixture.nativeElement.querySelectorAll('lp-panel button')]
      .find((element) => (element as HTMLButtonElement).textContent?.trim() === 'Nouvelle partie') as HTMLButtonElement | undefined;
    expect(button).toBeDefined();
    button!.click();
    expect(newGame).toHaveBeenCalledOnce();
  });

  it.each([false, true])('joue une seule carte au double-clic, case déjà sélectionnée : %s', (selected) => {
    const { fixture, store } = setup();
    store.draw();
    const index = store.state().board.findIndex((cell, i) => cell.kind === 'letter' && cell.filled === null && store.state().puzzle.solution[i] === store.topCard());
    if (selected) store.selectCell(index);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.crypto-cell-button:not(:disabled)');
    const button = buttons[0] as HTMLButtonElement;
    button.click();
    button.click();
    button.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    expect(store.state().board[index]).toMatchObject({ filled: store.state().puzzle.solution[index] });
    expect(store.state().hand).toHaveLength(0);
    expect(store.state().errors).toBe(0);
  });
});
