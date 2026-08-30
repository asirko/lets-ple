import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DictionaryService } from './dictionary.service';
import type { SerializedDefinitionEntry, SerializedPrefixIndex } from './serialized-dictionary';

const indexFixture: SerializedPrefixIndex = {
  C: { isWord: false, continuationCount: 1, nextLetters: ['H'] },
  CH: { isWord: false, continuationCount: 1, nextLetters: ['A'] },
  CHA: { isWord: false, continuationCount: 1, nextLetters: ['T'] },
  CHAT: {
    isWord: true,
    continuationCount: 1,
    nextLetters: ['O'],
    frequency: 12,
    definitionId: 'CHAT',
  },
  CHATO: { isWord: false, continuationCount: 1, nextLetters: ['N'] },
  CHATON: { isWord: true, continuationCount: 0, nextLetters: [], frequency: 4 },
};

const definitionsFixture: readonly SerializedDefinitionEntry[] = [
  {
    normalized: 'CHAT',
    forms: [{ spelling: 'chat', glosses: ['Mammifère félin domestique.'] }],
  },
];

describe('DictionaryService', () => {
  let http: HttpTestingController;
  let service: DictionaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DictionaryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('charge l’index une fois puis les définitions par initiale', async () => {
    const firstLoad = service.load();
    const secondLoad = service.load();
    const indexRequest = http.expectOne('/content/dictionaries/dernier-mot/index.json');
    indexRequest.flush(indexFixture);
    await Promise.all([firstLoad, secondLoad]);

    expect(service.lookup('cha')).toEqual({
      normalized: 'CHA',
      isWord: false,
      continuationCount: 1,
      nextLetters: ['T'],
    });
    expect(service.completions('cha', 2)).toEqual(['CHAT', 'CHATON']);
    expect(service.completions('chat', 2)).toEqual(['CHATON']);

    const definitions = service.definitions('CHAT');
    http
      .expectOne('/content/dictionaries/dernier-mot/definitions/C.json')
      .flush(definitionsFixture);
    expect(await definitions).toEqual(definitionsFixture[0].forms);
  });

  it('propage une erreur si le chargement de l’index échoue', async () => {
    const loading = service.load();
    http.expectOne('/content/dictionaries/dernier-mot/index.json').flush('indisponible', {
      status: 503,
      statusText: 'Service Unavailable',
    });

    await expectRejected(loading);
  });

  it('permet un nouveau chargement après une erreur d’index', async () => {
    const firstLoad = service.load();
    http.expectOne('/content/dictionaries/dernier-mot/index.json').flush('indisponible', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await expectRejected(firstLoad);

    const retry = service.load();
    http.expectOne('/content/dictionaries/dernier-mot/index.json').flush(indexFixture);
    await retry;

    await service.load();
  });

  it('retourne une liste vide lorsque le mot n’a pas de définition', async () => {
    const loading = service.load();
    http.expectOne('/content/dictionaries/dernier-mot/index.json').flush(indexFixture);
    await loading;

    expect(await service.definitions('CHATON')).toEqual([]);
  });

  it('met en cache un chunk de définitions déjà chargé', async () => {
    const loading = service.load();
    http.expectOne('/content/dictionaries/dernier-mot/index.json').flush(indexFixture);
    await loading;

    const firstDefinitions = service.definitions('CHAT');
    http
      .expectOne('/content/dictionaries/dernier-mot/definitions/C.json')
      .flush(definitionsFixture);
    await firstDefinitions;

    expect(await service.definitions('CHAT')).toEqual(definitionsFixture[0].forms);
  });

  it('charge une seule fois le manifeste utilisé par les crédits', async () => {
    const manifestFixture = {
      schemaVersion: 1 as const,
      generatedAt: '2026-08-29T22:58:00.000Z',
      entryCount: 47_920,
      sources: [
        {
          name: 'Lexique 4' as const,
          url: 'https://lexique.org/databases/Lexique400/Lexique400.tsv',
          retrievedAt: '2026-08-29T22:57:34.000Z',
          license: 'CC-BY-SA-4.0' as const,
          sha256: 'fe333b4f9e1797f23922d5863cde28635ee13685813af0f9b4b4b9f7d4610a5a',
        },
        {
          name: 'Wiktionnaire' as const,
          url: 'https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz',
          retrievedAt: '2026-08-29T22:58:00.000Z',
          license: 'CC-BY-SA-4.0' as const,
          sha256: 'f7c1756aa2e07b21e255d154f9ec9b51a1d8da126896b22dc7ac5873efa17c05',
        },
      ],
    };

    const firstLoad = service.manifest();
    const secondLoad = service.manifest();
    http.expectOne('/content/dictionaries/dernier-mot/manifest.json').flush(manifestFixture);

    expect(await firstLoad).toEqual(manifestFixture);
    expect(await secondLoad).toBe(await firstLoad);
  });

  it('réarme le chargement du manifeste après une erreur', async () => {
    const firstLoad = service.manifest();
    http.expectOne('/content/dictionaries/dernier-mot/manifest.json').flush('indisponible', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await expectRejected(firstLoad);

    const retry = service.manifest();
    http.expectOne('/content/dictionaries/dernier-mot/manifest.json').flush({
      schemaVersion: 1,
      generatedAt: '2026-08-29T22:58:00.000Z',
      entryCount: 47_920,
      sources: [],
      adaptation: {
        license: 'CC-BY-SA-4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        notice: 'Corpus dérivé.',
      },
    });

    expect((await retry).entryCount).toBe(47_920);
  });
});

async function expectRejected(promise: Promise<unknown>): Promise<void> {
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }
  expect(rejected).toBe(true);
}
