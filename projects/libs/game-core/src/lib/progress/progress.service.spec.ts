import { TestBed } from '@angular/core/testing';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  beforeEach(() => localStorage.clear());

  function create(): ProgressService {
    return TestBed.inject(ProgressService);
  }

  it('démarre à zéro sans historique stocké', () => {
    expect(create().progress()).toEqual({ played: 0, won: 0, currentStreak: 0 });
  });

  it('recordWin incrémente les parties jouées, gagnées et la série', () => {
    const service = create();
    service.recordWin();
    expect(service.progress()).toEqual({ played: 1, won: 1, currentStreak: 1 });
  });

  it('la série continue de grandir sur des victoires consécutives', () => {
    const service = create();
    service.recordWin();
    service.recordWin();
    service.recordWin();
    expect(service.progress()).toEqual({ played: 3, won: 3, currentStreak: 3 });
  });

  it("recordLoss incrémente les parties jouées sans incrémenter les victoires", () => {
    const service = create();
    service.recordLoss();
    expect(service.progress()).toEqual({ played: 1, won: 0, currentStreak: 0 });
  });

  it('une défaite remet la série à zéro sans toucher au total de victoires', () => {
    const service = create();
    service.recordWin();
    service.recordWin();
    service.recordLoss();
    expect(service.progress()).toEqual({ played: 3, won: 2, currentStreak: 0 });
  });

  it('persiste la progression : une nouvelle instance relit le dernier état', () => {
    create().recordWin();
    TestBed.resetTestingModule();
    expect(create().progress()).toEqual({ played: 1, won: 1, currentStreak: 1 });
  });
});
