import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import type { ComponentShowcase } from '@lets-ple/ui';
import { LpDictionaryCredits, type DictionaryCreditsManifest } from './lp-dictionary-credits';

const MANIFEST: DictionaryCreditsManifest = {
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

@Component({
  selector: 'lp-dictionary-credits-showcase',
  imports: [LpDictionaryCredits],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_dernier-mot.scss'],
  template: `<lp-dictionary-credits [manifest]="manifest" />`,
})
export class LpDictionaryCreditsShowcase {
  protected readonly manifest = MANIFEST;
}

export const LP_DICTIONARY_CREDITS_SHOWCASE: ComponentShowcase<LpDictionaryCreditsShowcase> = {
  component: LpDictionaryCreditsShowcase,
  controls: {},
};
