# Portail de jeux pédagogiques — Design v1 : le Cryptogramme

*Date : 2026-07-28*

## 1. Objectif

Construire un portail web hébergeant une famille de jeux de langue française, installable en PWA,
déployé en statique sur GitHub Pages derrière un sous-domaine personnel. Le premier jeu est un
**cryptogramme** : une citation dont chaque lettre est remplacée par un nombre, à reconstituer.

La vocation pédagogique passe par le contenu (citations sourcées, orthographe accentuée exacte)
plutôt que par un dispositif d'accompagnement explicite. Public v1 : grand public, adolescents et
adultes.

## 2. Périmètre

**Dans la v1**

- Le workspace Angular complet, prêt à accueillir d'autres jeux.
- Le portail : accueil, catalogue des jeux, PWA installable.
- Le jeu cryptogramme, jouable de bout en bout.
- Le schéma de corpus, son validateur et le calcul de difficulté, avec une dizaine de citations témoins.
- Le déploiement automatisé sur GitHub Pages.

**Hors périmètre**

Comptes utilisateurs, backend, multijoueur, classement en ligne, sons, autres jeux, profils
enfant / FLE, autres langues. Le corpus réel reste à la charge du propriétaire du projet.

## 3. Architecture du workspace

Un dépôt git unique, un workspace Angular multi-projets, un seul build déployé.

```
jeux-portail/
├─ projects/
│  ├─ ui/            (lib)  design system : tokens, cartes, boutons, layout, a11y
│  ├─ game-core/     (lib)  socle commun à tous les jeux
│  ├─ cryptogramme/  (lib)  le jeu 1
│  └─ portal/        (app)  shell + accueil + catalogue + PWA  ← seul build
├─ content/quotes/*.json     corpus source, éditable à la main
├─ tools/                    scripts Node : validation de schéma, scoring de difficulté
└─ docs/superpowers/specs/   ce document
```

**Pourquoi ce découpage.** Un jeu est une library autonome exposant ses propres routes, chargée en
lazy par le portail. Un seul build, un seul déploiement, une seule PWA — mais chaque jeu reste un
module isolé. Le jour où un jeu doit devenir une application autonome installable séparément, on
ajoute une coquille d'application autour de la lib existante, sans toucher au jeu.

**`game-core`** porte ce qui se répète d'un jeu à l'autre :

| Élément | Rôle |
|---|---|
| `GameDescriptor` | métadonnées d'un jeu pour le catalogue : id, titre, résumé, route, illustration, thèmes |
| `GAME_REGISTRY` | table des jeux et de leurs routes lazy |
| `I18nService` | chargement des dictionnaires JSON, résolution de clé avec interpolation |
| `StorageService` | accès `localStorage` typé et versionné |
| `ProgressService` | parties terminées, statistiques, préférences |

Ajouter un jeu revient à créer une library et à l'inscrire dans `GAME_REGISTRY`.

**`cryptogramme`** est coupée en deux couches :

- `domain/` — **moteur pur, aucune dépendance Angular** : chiffrement, construction de la pioche,
  réducteur d'état, calcul de difficulté. C'est le cœur de valeur du projet ; il se teste sans DOM,
  en quelques millisecondes.
- `ui/` — composants standalone à signals, pilotés par un store qui enveloppe le réducteur.

**Stack.** Node 24 LTS, Angular 22, composants standalone, signals, **zoneless**, builder
`@angular/build` (esbuild). Tests avec Vitest. Pour un jeu à état local entièrement déterministe,
signals + réducteur pur est exactement l'outil adapté.

## 4. Le jeu : règles

Une citation est chiffrée : chaque symbole de l'alphabet reçoit un nombre distinct, tiré au sort.
Les espaces, la ponctuation et les apostrophes restent toujours visibles.

**Une carte = une case.** Si la citation contient cinq « E », la pioche contient cinq cartes « E ».
La pioche est donc l'inventaire exact des cases restant à remplir : à la fin d'une partie gagnée,
elle est vide et toutes les cases sont pleines.

**Symboles.** Les lettres accentuées sont des symboles distincts : É, È, Ê et E occupent quatre
nombres différents. L'alphabet monte ainsi à une quarantaine de symboles. Le moteur expose
`accentMode: 'distinct' | 'merged'` ; `distinct` est le mode par défaut, `merged` reste disponible
comme réglage plus accessible.

**Départ.** Quelques correspondances sont offertes : environ 15 à 20 % des nombres distincts, avec
au moins une voyelle garantie. Toutes les cases portant un nombre offert sont pré-remplies, et les
cartes correspondantes ne figurent pas dans la pioche.

**La main est une pile LIFO.** Le joueur distribue une carte quand il le souhaite ; elle se pose
au-dessus des précédentes. **Seule la carte du dessus est jouable** ; celle du dessous réapparaît
une fois la première posée. Piocher trop tôt revient donc à s'enterrer sous des lettres dont on
ignore la destination. C'est la contrainte qui porte toute la tension du jeu.

**Interaction : case d'abord, carte ensuite.** Le joueur sélectionne une case vide, puis clique la
carte du dessus. Sans case sélectionnée, aucune pose n'est possible. Recliquer la case la
désélectionne.

**Résolution.** Pose juste : la case se remplit, la carte quitte la main, et la correspondance
nombre → symbole s'inscrit dans une table de correspondance visible. Pose fausse : une erreur est
comptée et **la carte reste en main**. À trois erreurs, la partie est perdue.

**Table de correspondance.** Une fois qu'un nombre est résolu, le joueur sait où vont les symboles
suivants — mais chaque case attend toujours sa propre carte. La déduction s'acquiert une fois,
l'exécution reste à mener.

**Garde-fou d'interface.** L'interface désactive les cases dont le nombre est déjà résolu et ne
correspond pas à la carte du dessus. Une erreur ne peut donc naître que d'un vrai pari sur un
nombre inconnu, jamais d'un clic malheureux. Le moteur, lui, reste strict et rejette la pose.

**Défaite.** On rejoue la même citation avec un nouveau chiffrement et une nouvelle pioche :
rejouer la grille identique rendrait la reprise triviale.

### Invariant fondamental

> `|pioche| + |main| = nombre de cases vides`, et la carte du dessus a **toujours** au moins une
> case valide disponible.

La pioche étant l'inventaire exact des cases vides, aucune position de blocage n'existe et aucune
partie n'est insoluble. Cet invariant est vérifié à chaque transition dans les tests.

## 5. Modèle d'état

```ts
type Sym = string;              // un symbole de l'alphabet, accentué ou non

type Cell =
  | { kind: 'fixed';  char: string }                                   // espace, ponctuation
  | { kind: 'letter'; code: number; filled: Sym | null; given: boolean };

interface Puzzle {
  quoteId:    string;
  seed:       string;                        // rejouabilité et tests déterministes
  accentMode: 'distinct' | 'merged';
  solution:   readonly (Sym | null)[];       // aligné sur board
}

interface GameState {
  puzzle:       Puzzle;
  board:        readonly Cell[];             // une entrée par caractère du texte
  known:        ReadonlyMap<number, Sym>;    // table de correspondance révélée
  deck:         readonly Sym[];              // pioche face cachée, ordre fixé par le seed
  hand:         readonly Sym[];              // pile LIFO, le dernier est jouable
  selectedCell: number | null;
  errors:       number;                      // 0 à 3
  status:       'playing' | 'won' | 'lost';
}
```

Le mélange de la pioche utilise un Fisher-Yates alimenté par un générateur pseudo-aléatoire seedé.
Une même graine reproduit exactement la même partie : les tests sont déterministes, et une
« énigme du jour » partageable devient possible plus tard sans changement de moteur.

### Actions

| Action | Effet | Précondition |
|---|---|---|
| `SELECT_CELL(i)` | sélectionne ou désélectionne une case | case `letter` non remplie |
| `DRAW` | dépile la pioche vers la main | pioche non vide |
| `PLAY` | joue la carte du dessus sur la case sélectionnée | case sélectionnée **et** main non vide |
| `RESTART` | nouvelle partie, même citation, nouvelle graine | — |

Transition `PLAY` :

```
carte = hand.at(-1)
si solution[selectedCell] === carte :
    board[selectedCell].filled = carte
    known[code] = carte
    hand.pop() ; selectedCell = null
    si plus aucune case letter vide → status = 'won'
sinon :
    errors++ ; selectedCell = null        // la carte reste en main
    si errors === 3 → status = 'lost'
```

## 6. Difficulté

La longueur seule ne dit rien : un texte plus long offre plus d'occurrences par lettre, donc plus
de prises pour la déduction. Le score est composite, **pré-calculé au build** par un script Node,
jamais recalculé à l'exécution.

| Facteur | Effet sur la difficulté |
|---|---|
| Occurrences moyennes par symbole distinct | ↑ = plus **facile** (davantage de contexte) |
| Part des symboles rares (K W X Y Z Q J, accents peu fréquents) | ↑ = plus dur |
| Mots de 1 à 3 lettres (à, y, le, de, et…) | ↑ = plus **facile** : ce sont les points d'entrée |
| Écart aux fréquences standard du français | ↑ = plus dur : l'analyse fréquentielle ne mord plus |
| Nombre de symboles distincts | ↑ = plus dur, et pioche plus longue |
| Notoriété de la citation | champ manuel, ↑ = plus facile |

Le score est normalisé de 0 à 100 puis réparti en cinq paliers. Les poids vivent dans un fichier de
configuration séparé, de façon à être recalibrés plus tard sur les statistiques de parties réelles.
Le mode `distinct` gonflant mécaniquement le nombre de symboles, la calibration est faite pour ce
mode et le mode `merged` produit des scores plus bas.

## 7. Corpus

Fichiers JSON par thème dans `content/quotes/`, éditables à la main, validés en intégration
continue. Thèmes : littérature, historique, scientifique, pop culture.

```json
{
  "id": "hugo-histoire-crime-01",
  "lang": "fr",
  "text": "Rien n'est plus puissant qu'une idée dont l'heure est venue.",
  "author": "Victor Hugo",
  "source": "Histoire d'un crime, 1877",
  "theme": "litterature",
  "notoriety": 4,
  "publicDomain": true
}
```

Le script `tools/` valide le schéma, refuse les doublons et enrichit chaque entrée d'un bloc
`difficulty: { score, tier, factors }` versionné dans le dépôt, afin que le calcul reste auditable.

Les champs `source` et `publicDomain` sont obligatoires. Le droit de citation ne couvre les œuvres
sous droits que si l'emprunt reste bref et crédité ; le schéma rend donc cette information
impossible à omettre.

## 8. Internationalisation

Interface et corpus en français uniquement, mais sans porte fermée : les textes d'interface vivent
dans des dictionnaires JSON (`i18n/fr.json`) résolus à l'exécution par `I18nService`, jamais en dur
dans les templates, et chaque citation porte un champ `lang`. Ajouter une langue reviendra à
ajouter un dictionnaire et un corpus, sans reprendre les composants.

`@angular/localize` est écarté : sa compilation par langue est disproportionnée pour un besoin de
bascule à l'exécution.

## 9. Persistance

`localStorage` via un service typé, sous des clés préfixées `jeux:v1:` et porteuses d'un
`schemaVersion` permettant une migration future. On y stocke la progression, les statistiques par
jeu et les préférences (mode accents, thème). Aucune donnée personnelle, aucun backend.

## 10. PWA et déploiement

Service worker Angular : coquille applicative en `prefetch`, corpus de citations en `lazy`. Le jeu
est entièrement jouable hors ligne une fois le thème visité.

GitHub Actions construit `portal` et publie sur GitHub Pages. Trois détails conditionnent le
succès du déploiement et sont intégrés dès le départ :

- **`404.html` en copie d'`index.html`** — GitHub Pages n'offre aucun repli SPA ; sans ce fichier,
  tout rechargement d'une route profonde renvoie une erreur.
- **`.nojekyll`** — sinon Jekyll écarte silencieusement les fichiers commençant par un underscore.
- **`CNAME`** contenant le sous-domaine, à republier à chaque déploiement.

Côté DNS, un enregistrement CNAME `<sous-domaine>` → `<utilisateur>.github.io`. Le sous-domaine
étant une racine, `base-href` vaut `/`.

**Valeurs à fournir avant le premier déploiement.** Trois éléments ne sont pas encore fixés et ne
bloquent pas le développement : le nom définitif du projet (`jeux-portail` est un nom de travail,
renommable), le compte et le dépôt GitHub cibles, et le sous-domaine retenu. Le workflow de
déploiement les lit depuis des variables, de sorte qu'aucun code applicatif n'en dépend.

## 11. Tests

Le moteur pur concentre l'effort, puisqu'il concentre les règles.

- **Réducteur** : chaque transition, chaque précondition, chaque condition de victoire et de défaite.
- **Invariant** : `|pioche| + |main| = cases vides` vérifié après chaque action d'une partie complète.
- **Solvabilité** : une partie jouée parfaitement à partir d'une graine quelconque se gagne toujours,
  sans aucune erreur. Testé sur un large échantillon de graines.
- **Chiffrement** : bijection nombre ↔ symbole, stabilité par graine, respect d'`accentMode`.
- **Scoring** : monotonie sur des cas construits — un texte enrichi en symboles rares score plus haut.
- **Corpus** : validation du schéma en intégration continue.

Les composants ne font l'objet que de tests de rendu et d'accessibilité ; toute la logique testable
vit dans `domain/`.

## 12. Décisions et hypothèses

Décisions arrêtées avec l'utilisateur :

1. Workspace Angular monorepo ; les jeux sont des libraries, le portail la seule application.
2. Français seul, avec la structure prête au multilingue.
3. Main en pile LIFO stricte : seule la carte du dessus est jouable.
4. Accents traités comme symboles distincts par défaut, `merged` disponible en réglage.
5. Public grand public / adolescents-adultes ; interface sobre et dense.
6. Corpus à la charge de l'utilisateur ; le projet fournit schéma, validateur, scoring et témoins.
7. Node 24 LTS et Angular 22.
8. Une carte égale une case : la pioche est l'inventaire des cases restantes.
9. La table de correspondance est révélée, mais chaque case attend sa propre carte.
10. Interaction en deux temps : sélection de la case, puis clic sur la carte.

Hypothèses posées par défaut, à renverser librement :

- Les correspondances offertes au départ représentent 15 à 20 % des nombres distincts, avec au moins
  une voyelle.
- Après une défaite, on rejoue la même citation avec un nouveau chiffrement.
- Ponctuation, espaces et apostrophes restent toujours visibles.
- Une pose fausse laisse la carte en main.
- L'interface désactive les cases dont le nombre résolu contredit la carte du dessus.
