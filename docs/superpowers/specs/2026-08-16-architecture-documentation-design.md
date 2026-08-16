# Architecture de la documentation — Design

## Contexte

`docs/superpowers/` accumule aujourd'hui, à plat, des specs et plans datés qui mélangent deux
choses différentes : du travail déjà terminé et validé (le plan v1, le déploiement Firebase) et du
travail en cours de conception (le modèle à piles multiples, le showcase de composants). Un agent
qui cherche « comment fonctionne le moteur de jeu » ou « comment redéployer » doit ouvrir des
documents de plusieurs centaines de lignes nommés par date, sans savoir a priori s'ils décrivent
l'état actuel du système ou une intention historique partiellement obsolète.

En parallèle, `CLAUDE.md` — chargé en entier à chaque session, pas à la demande — contient déjà de
larges sections en dur (structure du workspace, règle de pureté `domain/`, pipeline de scoring du
corpus, conventions i18n/storage) qui font double emploi avec ce que les specs historiques
racontent en plus détaillé. Rien n'est incrémental : soit c'est chargé systématiquement via
`CLAUDE.md`, soit il faut deviner quel document chronologique fouiller.

Ce spec restructure la documentation en trois rôles distincts et établit une convention pérenne
pour que cette séparation ne se dégrade pas avec le temps.

## Objectifs

- Une documentation système durable, organisée par thème et non par date, qu'un agent peut
  explorer **incrémentalement** : un index court toujours chargé, des fichiers détaillés lus
  seulement quand le sujet devient pertinent.
- `docs/superpowers/` redevient un dossier de travail : il ne contient que des specs/plans pas
  encore intégrés à la documentation durable. Une fois intégrés, ils sont supprimés — l'historique
  reste accessible via `git log`, pas via un dossier d'archive à maintenir.
- La convention qui maintient cet état (« intégrer avant de clore une tâche, puis supprimer ») est
  elle-même documentée, pour survivre aux futures sessions.

## Non-objectifs

- Ne pas réécrire le contenu technique lui-même — c'est une migration/réorganisation, pas une
  revue de fond des règles du jeu ou du pipeline de déploiement.
- Ne pas toucher aux 4 fichiers de travail en cours (`piles-multiples-cryptogramme*`,
  `showcase-composants*`) : rien n'existe encore dans le code à documenter pour ces sujets, ils
  restent sous `docs/superpowers/` jusqu'à implémentation.
- Ne pas changer l'AVERTISSEMENT légal en tête de `CLAUDE.md` ni son emplacement — c'est une porte
  de garde qui doit rester chargée à chaque session, pas une référence à charger à la demande.

## Structure de dossiers

```
docs/
├─ conventions/              comment écrire le code — existant, complété
│  ├─ commits.md
│  ├─ components.md
│  ├─ css.md                 + section « Pourquoi » (rationale SMACSS fusionnée)
│  └─ documentation.md        NOUVEAU — cycle de vie specs/plans → doc durable
├─ reference/                 NOUVEAU — comment le système fonctionne et pourquoi
│  ├─ architecture.md
│  ├─ domain-cryptogramme.md
│  ├─ corpus-pipeline.md
│  ├─ deployment-firebase.md
│  └─ i18n-storage.md
└─ superpowers/                zone de travail temporaire — ne contient que du non-intégré
   ├─ specs/
   └─ plans/
```

## Migration initiale — correspondance contenu

Sur les 9 fichiers actuels de `docs/superpowers/`, 5 décrivent un travail terminé et validé
(le plan v1 est coché à 88/88, le plan de déploiement Firebase à 17/17, l'issue GitHub #2
associée est fermée) : ce sont eux que cette migration intègre puis supprime.

| Source (supprimé une fois intégré) | Destination | Contenu extrait |
|---|---|---|
| `plans/2026-07-28-lets-ple-v1.md` | `docs/reference/architecture.md` | Structure du workspace (apps/libs/games), pipeline `domain/` fichier par fichier et sa raison d'être, choix de versions/outils justifiés, découpage `store/`/`ui/` |
| `specs/2026-07-28-architecture-css-smacss-design.md` | `docs/conventions/css.md` (section « Pourquoi », fusionnée, pas un nouveau fichier) | Rationale SMACSS — c'est la justification d'une convention de code déjà documentée là, pas de l'architecture système |
| `specs/2026-07-28-lets-ple-cryptogramme-design.md` | `docs/reference/domain-cryptogramme.md` (règles/rationale du moteur) **et** `docs/reference/corpus-pipeline.md` (partie corpus/légal) | Ce spec mélange design du moteur et design du corpus ; il se scinde selon les deux thèmes déjà distingués dans `CLAUDE.md` |
| `specs/2026-08-11-hebergement-firebase-design.md` + `plans/2026-08-11-firebase-hosting-deploy.md` | `docs/reference/deployment-firebase.md` | Guide Firebase (création projet, compte de service, secrets), `firebase.json`/`.firebaserc`, workflow CI, procédure de vérification post-déploiement |

Deux fichiers `docs/reference/` supplémentaires n'ont pas de source `superpowers/` dédiée — leur
contenu vit déjà en dur dans `CLAUDE.md` et est déplacé tel quel, sans extraction depuis un spec
historique :

| Destination | Contenu déplacé depuis `CLAUDE.md` |
|---|---|
| `docs/reference/corpus-pipeline.md` | Section actuelle « Corpus et difficulty scoring » |
| `docs/reference/i18n-storage.md` | Section actuelle « i18n et storage conventions » |

Les 4 fichiers restants (`specs/2026-08-16-piles-multiples-cryptogramme-design.md`,
`plans/2026-08-16-piles-multiples-cryptogramme.md`,
`specs/2026-08-16-showcase-composants-design.md`,
`plans/2026-08-16-showcase-composants.md`) ne sont pas touchés par cette migration.

## Nouvelle forme de `CLAUDE.md`

La section `## Architecture` actuelle (structure workspace, règle domain/ubi, corpus/difficulty,
i18n/storage — plusieurs longues sections en dur) est remplacée par une section `## Documentation`,
une carte courte qui pointe vers `docs/reference/` avec une phrase-déclencheur par doc, sur le
modèle de ce qui existe déjà pour `docs/conventions/` :

```markdown
## Documentation

- **Architecture** (workspace, pipeline domain/, règle de pureté) — lire
  `docs/reference/architecture.md` avant de toucher à la structure du projet ou à `domain/`.
- **Règles du jeu cryptogramme** (valeurs exactes, invariant de solvabilité, rationale) — lire
  `docs/reference/domain-cryptogramme.md` avant toute décision de règle de jeu.
- **Corpus et pipeline de citations** (scoring, QuoteKG, statut public domain) — lire
  `docs/reference/corpus-pipeline.md` avant de toucher à `content/quotes/` ou aux tools associés.
- **Déploiement Firebase Hosting** — lire `docs/reference/deployment-firebase.md` avant de
  toucher à la CI ou à la configuration Firebase.
- **i18n et storage** — lire `docs/reference/i18n-storage.md` avant de toucher à `I18nService`
  ou `StorageService`.
- CSS : `docs/conventions/css.md`. Composants : `docs/conventions/components.md`. Commits :
  `docs/conventions/commits.md`. Convention de documentation (superpowers = brouillon) :
  `docs/conventions/documentation.md`.
```

Le reste de `CLAUDE.md` (AVERTISSEMENT, description du projet, `## Commands`, `## Project
tracking`) ne change pas de contenu ; seul l'ordre/emplacement peut s'ajuster pour accueillir la
nouvelle section `## Documentation` à la place de l'ancienne `## Architecture`.

## `docs/conventions/documentation.md` — nouvelle convention

Nouveau fichier documentant le cycle de vie établi par ce spec :

1. Une conception (via `superpowers:brainstorming`/`writing-plans`) produit un spec et/ou un plan
   sous `docs/superpowers/` — c'est un brouillon de travail, jamais une référence durable.
2. Une fois l'implémentation terminée (plan entièrement coché, code en place), **avant de clore la
   tâche** : intégrer les faits durables (le *quoi* et le *pourquoi* qui restent vrais après coup)
   dans `docs/reference/*.md` ou `docs/conventions/*.md` selon le thème, et mettre à jour la carte
   dans `CLAUDE.md` si un nouveau doc apparaît.
3. Supprimer le spec/plan de `docs/superpowers/` une fois l'intégration faite — rien à archiver,
   l'historique reste dans `git log`.
4. Tant qu'une tâche n'est pas terminée, son spec/plan reste légitimement sous
   `docs/superpowers/` — ce n'est pas un dossier vide en temps normal, c'est un dossier qui ne
   contient que du travail en cours.

## Critères d'acceptation

- `docs/reference/architecture.md`, `domain-cryptogramme.md`, `corpus-pipeline.md`,
  `deployment-firebase.md`, `i18n-storage.md` existent et contiennent le contenu mappé ci-dessus,
  sans perte d'information par rapport aux sources.
- `docs/conventions/css.md` contient la rationale SMACSS fusionnée ; `docs/conventions/
  documentation.md` existe avec le cycle de vie ci-dessus.
- `CLAUDE.md` contient la nouvelle section `## Documentation` et ne contient plus les sections
  détaillées désormais déplacées.
- Les 5 fichiers `superpowers/` listés dans la migration initiale n'existent plus ; les 4 fichiers
  de travail en cours existent toujours, inchangés.
- Aucun lien mort : chaque chemin cité dans `CLAUDE.md` ou dans `docs/reference/*.md` pointe vers
  un fichier qui existe réellement.
