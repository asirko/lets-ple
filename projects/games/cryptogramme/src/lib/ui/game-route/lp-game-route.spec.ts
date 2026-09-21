import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LpGameRoute } from './lp-game-route';
import type { Quote } from '../../quotes/quote';
import { By } from '@angular/platform-browser';
import { LpGamePage } from '../game-page/lp-game-page';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';

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
    localStorage.removeItem('letsple:v1:cryptogramme:activeGame');
    TestBed.configureTestingModule({
      imports: [LpGameRoute],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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

  function loadQuotes(quotes: Quote[]) {
    const fixture = TestBed.createComponent(LpGameRoute);
    fixture.detectChanges();
    httpMock.expectOne('content/quotes/litterature.json').flush(quotes);
    fixture.detectChanges();
    return fixture;
  }

  it('choisit une autre citation sans recharger le corpus et renouvelle la seed', () => {
    const fixture = loadQuotes([QUOTE, { ...QUOTE, id: 'q2', text: 'La vie est belle.' }]);
    const page = fixture.debugElement.query(By.directive(LpGamePage));
    const initialId = page.componentInstance.quoteId();
    const initialSeed = page.componentInstance.seed();
    page.triggerEventHandler('newGame');
    fixture.detectChanges();
    expect(page.componentInstance.quoteId()).not.toBe(initialId);
    expect(page.componentInstance.seed()).not.toBe(initialSeed);
  });

  it('reprend les cartes et la sélection après avoir recréé la route', () => {
    const fixture = loadQuotes([QUOTE]);
    const deck = fixture.nativeElement.querySelector('.crypto-deck') as HTMLButtonElement;
    deck.click();
    fixture.detectChanges();
    const cell = fixture.nativeElement.querySelector('.crypto-cell-button:not(:disabled)') as HTMLButtonElement;
    cell.click();
    fixture.detectChanges();
    const hand = fixture.nativeElement.querySelector('.crypto-hand').textContent;
    const selected = fixture.nativeElement.querySelector('.crypto-cell-selected')?.getAttribute('aria-label');
    fixture.destroy();
    const resumed = TestBed.createComponent(LpGameRoute);
    resumed.detectChanges();
    expect(resumed.nativeElement.querySelector('.crypto-hand')?.textContent).toBe(hand);
    expect(resumed.nativeElement.querySelector('.crypto-cell-selected')?.getAttribute('aria-label')).toBe(selected);
    httpMock.expectOne('content/quotes/litterature.json').flush([QUOTE]);
    resumed.detectChanges();
    expect(resumed.nativeElement.querySelector('.crypto-hand')?.textContent).toBe(hand);
  });

  it('permet de réessayer le catalogue tout en conservant la partie reprise', () => {
    const initial = loadQuotes([QUOTE]);
    initial.destroy();
    const fixture = TestBed.createComponent(LpGameRoute);
    fixture.detectChanges();
    httpMock.expectOne('content/quotes/litterature.json').flush('Erreur', { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('lp-game-page')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Votre partie sauvegardée reste disponible');
    const retry = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    retry.find((button) => button.textContent?.includes('Réessayer le chargement'))!.click();
    httpMock.expectOne('content/quotes/litterature.json').flush([QUOTE]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Votre partie sauvegardée reste disponible');
  });

  it('applique les bornes inclusives aux lettres accentuées sans compter la ponctuation', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const fixture = loadQuotes([QUOTE, { ...QUOTE, id: 'q2', text: 'Éléphant, ici !' }]);
    random.mockRestore();
    const page = fixture.debugElement.query(By.directive(LpGamePage));
    page.triggerEventHandler('minLettersChange', 11);
    page.triggerEventHandler('maxLettersChange', 11);
    fixture.detectChanges();
    expect(page.componentInstance.quoteId()).toBe('q1');
    page.triggerEventHandler('newGame');
    fixture.detectChanges();
    expect(page.componentInstance.filterError?.()).toBeNull();
    expect(page.componentInstance.quoteId()).toBe('q2');
  });

  it.each([[100, null], [1, 2], [0, null], [1.5, null], [NaN, null], [null, Infinity]])(
    'conserve la partie sans correspondance ou avec une borne invalide (%s, %s)', (min, max) => {
      const fixture = loadQuotes([QUOTE]);
      const page = fixture.debugElement.query(By.directive(LpGamePage));
      const seed = page.componentInstance.seed();
      page.triggerEventHandler('minLettersChange', min);
      page.triggerEventHandler('maxLettersChange', max);
      page.triggerEventHandler('newGame');
      fixture.detectChanges();
      expect(page.componentInstance.filterError?.()).toBeTruthy();
      expect(page.componentInstance.seed()).toBe(seed);
    },
  );

  it('signale quand seule la citation courante correspond aux filtres', () => {
    const fixture = loadQuotes([QUOTE]);
    const page = fixture.debugElement.query(By.directive(LpGamePage));
    const seed = page.componentInstance.seed();
    page.triggerEventHandler('newGame');
    fixture.detectChanges();
    expect(page.componentInstance.filterError?.()).toBeTruthy();
    expect(page.componentInstance.seed()).toBe(seed);
  });

  it('conserve la partie quand les bornes sont inversées', () => {
    const fixture = loadQuotes([QUOTE]);
    const page = fixture.debugElement.query(By.directive(LpGamePage));
    const seed = page.componentInstance.seed();
    page.triggerEventHandler('minLettersChange', 100);
    page.triggerEventHandler('maxLettersChange', 10);
    page.triggerEventHandler('newGame');
    fixture.detectChanges();
    expect(page.componentInstance.filterError?.()).toBeTruthy();
    expect(page.componentInstance.seed()).toBe(seed);
  });

  it('affiche une erreur et permet de réessayer après un échec du chargement', () => {
    const fixture = TestBed.createComponent(LpGameRoute);
    fixture.detectChanges();
    httpMock.expectOne('content/quotes/litterature.json').flush('Erreur', { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.nativeElement.querySelector('button').click();
    httpMock.expectOne('content/quotes/litterature.json').flush([QUOTE]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('lp-game-page')).not.toBeNull();
  });
});
