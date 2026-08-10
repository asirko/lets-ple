export type Theme = 'litterature' | 'historique' | 'scientifique' | 'pop-culture';

export interface Quote {
  id: string;
  lang: 'fr';
  text: string;
  author: string;
  source: string;
  theme: Theme;
  notoriety: 1 | 2 | 3 | 4 | 5;
  publicDomain: boolean;
}
