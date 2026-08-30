import { TestBed } from '@angular/core/testing';
import { LpTurnDialog, type TurnDialogView } from './lp-turn-dialog';

describe('LpTurnDialog', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  it.each(TURN_VIEWS)('rend la variante $kind déjà calculée', (view) => {
    const fixture = TestBed.createComponent(LpTurnDialog);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('view', view);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain(view.title);
    expect(fixture.nativeElement.textContent).toContain(view.message);
    expect(primaryButton(fixture.nativeElement).textContent).toContain(view.primaryActionLabel);
  });

  it("n’émet que l'action principale explicitement demandée", () => {
    const fixture = TestBed.createComponent(LpTurnDialog);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('view', TURN_VIEWS[1]);
    const emitted: void[] = [];
    fixture.componentInstance.primaryAction.subscribe(() => emitted.push(undefined));
    fixture.detectChanges();

    primaryButton(fixture.nativeElement).click();

    expect(emitted).toHaveLength(1);
  });

  it('demande le dépliage de la définition sans le décider', () => {
    const fixture = TestBed.createComponent(LpTurnDialog);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('view', TURN_VIEWS[2]);
    fixture.componentRef.setInput('definitionExpanded', false);
    const emitted: void[] = [];
    fixture.componentInstance.definitionToggled.subscribe(() => emitted.push(undefined));
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[data-definition-toggle]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();

    expect(emitted).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[data-definitions]')).toBeNull();
  });

  it.each(TURN_VIEWS.filter((view) => view.word !== undefined))(
    'rend le mot structuré de la variante $kind',
    (view) => {
      const fixture = TestBed.createComponent(LpTurnDialog);
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('view', view);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-turn-word]')?.textContent.trim()).toBe(
        view.word,
      );
    },
  );
});

const PLAYERS = [
  { id: 'alice', name: 'Alice', score: 4, active: true },
  { id: 'basile', name: 'Basile', score: 3, active: true },
];

const TURN_VIEWS: readonly TurnDialogView[] = [
  {
    kind: 'first-player',
    title: 'Alice commence',
    message: 'Passez le téléphone à Alice.',
    primaryActionLabel: 'Alice est prête',
  },
  {
    kind: 'valid-prefix',
    title: 'La manche continue',
    message: '12 prolongements restent possibles.',
    primaryActionLabel: 'Passer à Basile',
  },
  {
    kind: 'intermediate-word',
    title: 'CHAT rapporte 1 point',
    message: 'Alice forme un mot valide.',
    primaryActionLabel: 'Passer à Basile',
    word: 'CHAT',
    definitions: ['Petit félin domestique.'],
  },
  {
    kind: 'invalid-letter',
    title: 'CHAX est impossible',
    message: 'Alice perd 1 point et est éliminée de la manche.',
    primaryActionLabel: 'Passer à Basile',
    word: 'CHAX',
  },
  {
    kind: 'elimination-round-end',
    title: 'Fin de la manche',
    message: 'Aucun joueur ne gagne cette manche.',
    primaryActionLabel: 'Basile commence la manche suivante',
    completions: ['CHAI', 'CHALET'],
    players: PLAYERS,
  },
  {
    kind: 'terminal-word',
    title: 'Dernier mot !',
    message: 'Alice marque 3 points avec ZYGOTE.',
    primaryActionLabel: 'Commencer la manche suivante',
    word: 'ZYGOTE',
    definitions: ['Cellule issue de la fécondation.'],
    players: PLAYERS,
  },
  {
    kind: 'game-over',
    title: 'Alice et Basile gagnent',
    message: 'Victoire ex æquo avec 12 points.',
    primaryActionLabel: 'Refaire une partie',
    players: PLAYERS,
    winnerIds: ['alice', 'basile'],
  },
];

function primaryButton(root: HTMLElement): HTMLButtonElement {
  return root.querySelector('[data-primary-action]') as HTMLButtonElement;
}
