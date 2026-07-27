/** Types partagés du moteur. Aucun import : ce fichier est la base de tout le domaine. */

/**
 * Un symbole de l'alphabet de jeu, toujours en majuscule.
 *
 * En mode `distinct`, 'É' et 'E' sont deux symboles différents et reçoivent donc deux nombres
 * différents. En mode `merged`, tous deux deviennent 'E'.
 */
export type Sym = string;

/** Traitement des lettres accentuées. `distinct` est le mode par défaut du jeu. */
export type AccentMode = 'distinct' | 'merged';

/**
 * Une case du plateau, une par caractère du texte d'origine.
 *
 * `fixed` couvre les espaces, la ponctuation et les apostrophes : toujours visibles, jamais
 * jouables. `letter` porte le nombre affiché au joueur, et `char` conserve le caractère
 * accentué d'origine — c'est lui qui sera affiché une fois la case remplie, de façon à
 * restituer l'orthographe exacte de la citation.
 */
export type Cell =
  | { readonly kind: 'fixed'; readonly char: string }
  | {
      readonly kind: 'letter';
      readonly code: number;
      readonly char: string;
      readonly filled: Sym | null;
      readonly given: boolean;
    };
