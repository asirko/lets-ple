export type Theme = 'litterature' | 'historique' | 'scientifique' | 'pop-culture';

export interface DifficultyFactors {
  occurrencesPerSymbol: number;
  rareSymbolRatio: number;
  shortWordRatio: number;
  frequencyDivergence: number;
  distinctSymbols: number;
}

export interface Difficulty {
  score: number;
  tier: 1 | 2 | 3 | 4 | 5;
  factors: Record<string, number>;
}

export interface Quote {
  id: string;
  lang: 'fr';
  text: string;
  author: string;
  source: string;
  theme: Theme;
  notoriety: 1 | 2 | 3 | 4 | 5;
  publicDomain: boolean;
  difficulty?: Difficulty;
}

export const THEMES: readonly Theme[] = ['litterature', 'historique', 'scientifique', 'pop-culture'];
