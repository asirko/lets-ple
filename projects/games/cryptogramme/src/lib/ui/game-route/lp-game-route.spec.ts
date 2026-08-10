import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LpGameRoute } from './lp-game-route';
import type { Quote } from '../../quotes/quote';

describe('LpGameRoute', () => {
  let httpMock: HttpTestingController;

  const QUOTE: Quote = {
    id: 'q1',
    lang: 'fr',
    text: 'Une citation.',
    author: 'Anonyme',
    source: 'Source',
    theme: 'litterature',
    notoriety: 3,
    publicDomain: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LpGameRoute],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge le thème littérature au démarrage', () => {
    TestBed.createComponent(LpGameRoute).detectChanges();
    httpMock.expectOne('content/quotes/litterature.json').flush([QUOTE]);
  });

  it('affiche la page de jeu une fois la citation reçue', () => {
    const fixture = TestBed.createComponent(LpGameRoute);
    fixture.detectChanges();
    httpMock.expectOne('content/quotes/litterature.json').flush([QUOTE]);
    fixture.detectChanges();

    const gamePage = fixture.nativeElement.querySelector('lp-game-page');
    expect(gamePage).not.toBeNull();
  });

  it("n'affiche rien tant que la citation n'est pas arrivée", () => {
    const fixture = TestBed.createComponent(LpGameRoute);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('lp-game-page')).toBeNull();
    httpMock.expectOne('content/quotes/litterature.json').flush([QUOTE]);
  });
});
