import { TestBed } from '@angular/core/testing';
import { LpScoreboard } from './lp-scoreboard';

describe('LpScoreboard', () => {
  it('distingue le joueur courant et un joueur éliminé sans masquer leur score', () => {
    const fixture = TestBed.createComponent(LpScoreboard);
    fixture.componentRef.setInput('players', [
      { id: 'alice', name: 'Alice', score: 4, active: true },
      { id: 'basile', name: 'Basile', score: 2, active: false },
    ]);
    fixture.componentRef.setInput('currentPlayerId', 'alice');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-score-player]');
    expect(rows[0].getAttribute('aria-current')).toBe('true');
    expect(rows[1].textContent).toContain('Éliminé');
    expect(rows[1].textContent).toContain('2');
  });

  it('annonce tous les vainqueurs ex æquo', () => {
    const fixture = TestBed.createComponent(LpScoreboard);
    fixture.componentRef.setInput('players', [
      { id: 'alice', name: 'Alice', score: 12, active: true },
      { id: 'basile', name: 'Basile', score: 12, active: true },
      { id: 'chloe', name: 'Chloé', score: 10, active: true },
    ]);
    fixture.componentRef.setInput('winnerIds', ['alice', 'basile']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-winner="true"]')).toHaveLength(2);
  });

  it("présente un vainqueur comme tel même s'il a été éliminé pendant la manche", () => {
    const fixture = TestBed.createComponent(LpScoreboard);
    fixture.componentRef.setInput('players', [
      { id: 'alice', name: 'Alice', score: 12, active: false },
      { id: 'basile', name: 'Basile', score: 3, active: true },
    ]);
    fixture.componentRef.setInput('winnerIds', ['alice']);
    fixture.detectChanges();

    const winner = fixture.nativeElement.querySelector('[data-winner="true"]');
    expect(winner.classList).not.toContain('is-eliminated');
    expect(winner.textContent).toContain('Vainqueur');
    expect(winner.textContent).not.toContain('Éliminé');
  });

  it('présente comme éliminé un joueur courant devenu inactif', () => {
    const fixture = TestBed.createComponent(LpScoreboard);
    fixture.componentRef.setInput('players', [
      { id: 'alice', name: 'Alice', score: 0, active: false },
      { id: 'basile', name: 'Basile', score: 2, active: true },
    ]);
    fixture.componentRef.setInput('currentPlayerId', 'alice');
    fixture.detectChanges();

    const eliminated = fixture.nativeElement.querySelector('[data-score-player]');
    expect(eliminated.textContent).toContain('Éliminé');
    expect(eliminated.textContent).not.toContain('À son tour');
    expect(eliminated.getAttribute('aria-current')).toBeNull();
    expect(eliminated.classList).not.toContain('is-current');
  });
});
