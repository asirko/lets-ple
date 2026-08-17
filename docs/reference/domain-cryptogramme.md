# Règles du jeu — Cryptogramme

Ce document est la référence des règles exactes et de leur rationale. Toute décision de règle de
jeu doit être vérifiée contre ce document avant modification — les valeurs ci-dessous ne sont pas
arbitraires, chacune a été choisie pour une raison précise.

## Principe

Une citation est chiffrée : chaque symbole de l'alphabet reçoit un nombre distinct, tiré au sort.
Espaces, ponctuation et apostrophes restent toujours visibles. **Une carte = une case** : si la
citation contient cinq « E », la pioche contient cinq cartes « E ». La pioche est donc l'inventaire
exact des cases restant à remplir.

## Symboles et accents

Les lettres accentuées sont des symboles distincts par défaut : É, È, Ê et E occupent quatre
nombres différents (`accentMode: 'distinct'`, environ une quarantaine de symboles au total). Le
mode `merged` reste disponible comme réglage plus accessible.

## Cadeaux de départ

**Deux à trois correspondances** sont offertes au démarrage, jamais davantage — le palier de
difficulté choisit deux pour les citations les plus abordables, trois pour les plus ardues. Toutes
les cases portant un nombre offert sont pré-remplies, les cartes correspondantes ne figurent pas
dans la pioche.

Le tirage n'est **pas uniforme** parmi les symboles : un tirage uniforme tomberait souvent sur un Ê
ou un W apparaissant une seule fois, sans offrir aucune prise. Les cadeaux sont donc tirés parmi les
symboles **les plus fréquents** de la citation, avec **au moins une voyelle garantie**.

## La main — pile LIFO à capacité 5

Le joueur distribue une carte quand il le souhaite ; elle se pose au-dessus des précédentes. **Seule
la carte du dessus est jouable** ; celle du dessous réapparaît une fois la première posée. La main
ne dépasse jamais **cinq cartes** (`handCapacity`, paramètre nommé et non une constante disséminée
— c'est le premier curseur d'équilibrage) : au-delà, la pioche est fermée tant qu'une carte n'a pas
été placée.

Cette capacité change la nature du jeu. Sans elle, un joueur bloqué pouvait piocher indéfiniment
jusqu'à tomber sur une lettre qu'il savait placer — la pioche n'avait qu'un coût d'encombrement.
Avec cinq cartes, main pleine et carte du dessus indéterminable, il ne reste qu'une option : parier.
C'est là que les **trois erreurs** (`maxErrors`) prennent tout leur poids, et c'est cette tension
qui porte le jeu.

## Interaction et résolution

Case d'abord, carte ensuite : le joueur sélectionne une case vide, puis clique la carte du dessus.
Sans case sélectionnée, aucune pose n'est possible ; recliquer la case la désélectionne.

- **Pose juste** : la case se remplit, la carte quitte la main, la correspondance nombre → symbole
  s'inscrit dans une table de correspondance visible.
- **Pose fausse** : une erreur est comptée et **la carte reste en main**. À trois erreurs, la partie
  est perdue.
- **Garde-fou d'interface** : les cases dont le nombre est déjà résolu et ne correspond pas à la
  carte du dessus sont désactivées — une erreur ne peut naître que d'un vrai pari sur un nombre
  inconnu, jamais d'un clic malheureux. Le moteur, lui, reste strict et rejette la pose même sans ce
  garde-fou.
- **Défaite** : on rejoue la même citation avec un nouveau chiffrement et une nouvelle pioche —
  rejouer la grille identique rendrait la reprise triviale.

## Invariant fondamental

> `|pioche| + |main| = nombre de cases vides`, et la carte du dessus a **toujours** au moins une
> case valide disponible.

La pioche étant l'inventaire exact des cases vides, aucune partie n'est insoluble : quelle que soit
la carte du dessus, il existe forcément une case où la poser correctement. La limite de cinq cartes
ne crée donc jamais de blocage **mécanique** — une action juste reste toujours possible. Ce qu'elle
crée, c'est un blocage **informationnel** : le joueur peut ignorer *laquelle* des cases est la
bonne, et devoir parier. C'est le ressort du jeu, pas un défaut de conception.

Cet invariant est vérifié à chaque transition dans `invariants.spec.ts`, sur environ 50 graines ×
4 formes de citation. Toute modification de `game.ts`, `deck.ts` ou `givens.ts` doit être
re-vérifiée contre ce test, pas seulement contre ses propres tests unitaires — invoquer l'agent
`engine-invariant-guardian` juste après un tel changement, avant de continuer.

## Modèle d'état

```ts
type Sym = string;              // un symbole de l'alphabet, accentué ou non

type Cell =
  | { kind: 'fixed';  char: string }                                   // espace, ponctuation
  | { kind: 'letter'; code: number; filled: Sym | null; given: boolean };

interface Puzzle {
  quoteId:       string;
  seed:          string;                     // rejouabilité et tests déterministes
  accentMode:    'distinct' | 'merged';
  handCapacity:  number;                     // 5 par défaut
  maxErrors:     number;                     // 3 par défaut
  solution:      readonly (Sym | null)[];    // aligné sur board
}

interface GameState {
  puzzle:       Puzzle;
  board:        readonly Cell[];             // une entrée par caractère du texte
  known:        ReadonlyMap<number, Sym>;    // table de correspondance révélée
  deck:         readonly Sym[];              // pioche face cachée, ordre fixé par le seed
  hand:         readonly Sym[];              // pile LIFO, 5 max, le dernier est jouable
  selectedCell: number | null;
  errors:       number;                      // 0 à 3
  status:       'playing' | 'won' | 'lost';
}
```

Le mélange de la pioche utilise un Fisher-Yates alimenté par un générateur pseudo-aléatoire seedé :
une même graine reproduit exactement la même partie, ce qui rend les tests déterministes et rend
possible, plus tard sans changement de moteur, une « énigme du jour » partageable.

### Actions

| Action | Effet | Précondition |
|---|---|---|
| `SELECT_CELL(i)` | sélectionne ou désélectionne une case | case `letter` non remplie |
| `DRAW` | dépile la pioche vers la main | pioche non vide **et** main non pleine (`< handCapacity`) |
| `PLAY` | joue la carte du dessus sur la case sélectionnée | case sélectionnée **et** main non vide |
| `RESTART` | nouvelle partie, même citation, nouvelle graine | — |

## Décisions arrêtées (à ne pas renverser sans re-discussion)

1. Main en pile LIFO stricte, plafonnée à cinq cartes : seule celle du dessus est jouable, la
   pioche se ferme quand la main est pleine.
2. Accents traités comme symboles distincts par défaut, `merged` disponible en réglage.
3. Une carte égale une case : la pioche est l'inventaire des cases restantes.
4. La table de correspondance est révélée, mais chaque case attend sa propre carte.
5. Interaction en deux temps : sélection de la case, puis clic sur la carte.

## Hypothèses posées par défaut (renversables librement)

- Les cadeaux de départ sont deux ou trois, tirés parmi les symboles les plus fréquents, avec au
  moins une voyelle.
- Après une défaite, on rejoue la même citation avec un nouveau chiffrement.
- Une pose fausse laisse la carte en main.
- La partie commence main vide : c'est au joueur de distribuer sa première carte.

Détail du calcul de difficulté (composite, pré-calculé au build) : `docs/reference/corpus-pipeline.md`.
La structure du code de `domain/` (fichiers, ordre du pipeline) : `docs/reference/architecture.md`.
