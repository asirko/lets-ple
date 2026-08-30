import { TestBed } from '@angular/core/testing';
import { LpDictionaryCredits } from './lp-dictionary-credits';

const manifestFixture = {
  schemaVersion: 1,
  generatedAt: '2026-08-29T22:58:00.000Z',
  entryCount: 47_920,
  sources: [
    {
      name: 'Lexique 4',
      url: 'https://lexique.org/databases/Lexique400/Lexique400.tsv',
      retrievedAt: '2026-08-29T22:57:34.000Z',
      license: 'CC-BY-SA-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      creators: [
        'Boris New',
        'Christophe Pallier',
        'Gauvain Schalchli',
        'Jessica Bourgin',
        'Manuel Gimenes',
      ],
      citation: {
        text: 'New, B., Pallier, C., Schalchli, G., Bourgin, J., & Gimenes, M. (2026). Lexique 4: A major upgrade of the Lexique French lexical database. Behavior Research Methods, 58(5), Article 140.',
        url: 'https://doi.org/10.3758/s13428-026-02967-5',
      },
      sha256: 'fe333b4f9e1797f23922d5863cde28635ee13685813af0f9b4b4b9f7d4610a5a',
    },
    {
      name: 'Wiktionnaire',
      url: 'https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz',
      retrievedAt: '2026-08-29T22:58:00.000Z',
      license: 'CC-BY-SA-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      creators: ['Contributeurs du Wiktionnaire en français'],
      attributionUrl:
        'https://fr.wiktionary.org/wiki/Wiktionnaire:R%C3%A9utilisation_du_contenu_du_Wiktionnaire',
      articleUrlTemplate: 'https://fr.wiktionary.org/wiki/{title}',
      contributorsUrlTemplate: 'https://fr.wiktionary.org/w/index.php?title={title}&action=history',
      extractor: {
        name: 'Wiktextract',
        creator: 'Tatu Ylonen',
        url: 'https://github.com/tatuylonen/wiktextract',
        license: 'MIT',
        licenseUrl: 'https://github.com/tatuylonen/wiktextract/blob/master/LICENSE',
      },
      sha256: 'f7c1756aa2e07b21e255d154f9ec9b51a1d8da126896b22dc7ac5873efa17c05',
    },
  ],
  adaptation: {
    license: 'CC-BY-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    notice:
      'Corpus dérivé : sélection de lemmes, exclusion des formes fléchies et graphies non alphabétiques, normalisation de la casse, des accents et des ligatures, fusion des homographes normalisés, construction d’un index de préfixes et découpage des définitions par initiale.',
  },
};

describe('LpDictionaryCredits', () => {
  it('affiche les sources du manifeste, leur licence et leur date de collecte', async () => {
    await TestBed.configureTestingModule({ imports: [LpDictionaryCredits] }).compileComponents();
    const fixture = TestBed.createComponent(LpDictionaryCredits);
    fixture.componentRef.setInput('manifest', manifestFixture);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'),
    );

    expect(text).toContain('Lexique 4');
    expect(text).toContain('Wiktionnaire');
    expect(text).toContain('Wiktextract');
    expect(text).toContain('Boris New');
    expect(text).toContain('Contributeurs du Wiktionnaire en français');
    expect(text).toContain('Tatu Ylonen');
    expect(text).toContain('sélection de lemmes');
    expect(text.match(/CC BY-SA 4\.0/g)).toHaveLength(3);
    expect(text.match(/29 août 2026/g)).toHaveLength(2);
    expect(links.map((link) => link.href)).toContain(
      'https://creativecommons.org/licenses/by-sa/4.0/',
    );
    expect(links.map((link) => link.href)).toContain(
      'https://lexique.org/databases/Lexique400/Lexique400.tsv',
    );
    expect(links.map((link) => link.href)).toContain(
      'https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz',
    );
    expect(links.map((link) => link.href)).toContain('https://doi.org/10.3758/s13428-026-02967-5');
    expect(links.map((link) => link.href)).toContain(
      'https://fr.wiktionary.org/wiki/Wiktionnaire:R%C3%A9utilisation_du_contenu_du_Wiktionnaire',
    );
    expect(links.map((link) => link.href)).toContain('https://github.com/tatuylonen/wiktextract');
    expect(links.map((link) => link.href)).toContain(
      'https://github.com/tatuylonen/wiktextract/blob/master/LICENSE',
    );
  });
});
