export type AnswerType = 'country' | 'capital';
export type QuestionType = 'silhouette' | 'flag' | 'country-from-capital' | 'capital' | 'neighbors';
export type Mode = 'cash' | 'carre' | 'duo';
export type Position = readonly [number, number];
export type Geometry =
  | { readonly type: 'Polygon'; readonly coordinates: readonly (readonly Position[])[] }
  | {
      readonly type: 'MultiPolygon';
      readonly coordinates: readonly (readonly (readonly Position[])[])[];
    };

export interface Country {
  readonly iso2: string;
  readonly iso3: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly capitals: readonly string[];
  readonly capitalAliases: Readonly<Record<string, readonly string[]>>;
  readonly continent: string;
  readonly subregion: string;
  readonly borders: readonly string[];
  readonly flag: string;
  readonly flagEligible: boolean;
  readonly capitalEligible: boolean;
  readonly geometry?: Geometry;
}

export interface Answer {
  readonly id: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly countryCodes: readonly string[];
}

export interface Question {
  readonly id: string;
  readonly type: QuestionType;
  readonly promptKey: string;
  readonly promptParams: Readonly<Record<string, string>>;
  readonly answerType: AnswerType;
  readonly correctAnswers: readonly string[];
  readonly countryCode: string;
  readonly data:
    | { readonly kind: 'flag'; readonly src: string }
    | { readonly kind: 'silhouette'; readonly geometry: Geometry }
    | { readonly kind: 'neighbors'; readonly names: readonly string[] }
    | { readonly kind: 'text' };
}

export type Random = () => number;
