import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { QuoteService } from './quote.service';
import type { Quote } from './quote';

describe('QuoteService', () => {
  let httpMock: HttpTestingController;
  let service: QuoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(QuoteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('récupère le fichier du thème demandé', () => {
    let result: Quote[] | undefined;
    service.loadTheme('historique').subscribe((quotes) => (result = quotes));

    const req = httpMock.expectOne('content/quotes/historique.json');
    expect(req.request.method).toBe('GET');
    const fixture: Quote[] = [
      {
        id: 'q1',
        lang: 'fr',
        text: 'Une citation.',
        author: 'Anonyme',
        source: 'Source',
        theme: 'historique',
        notoriety: 3,
        publicDomain: true,
      },
    ];
    req.flush(fixture);

    expect(result).toEqual(fixture);
  });
});
