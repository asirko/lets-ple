# Versions et mises à jour

La version de `package.json` et l'historique
`projects/apps/portal/src/app/releases/releases.json` sont embarqués dans le JavaScript
du portail. Les nouveautés correspondent au build réellement exécuté, même hors ligne.

## Préparer une version

Depuis une branche issue de `develop`, committer les changements puis lancer :

```sh
npm test
npm run test:ng -- --watch=false
npm run build
npm run release:prepare -- --dry-run
npm run release:prepare
```

Le dry-run affiche la version cible et les notes sans mutation. Le script lit les commits
non-merge entre `v<version courante>` et HEAD, avec leur corps complet :

| Commits depuis le tag | Version |
| --- | --- |
| Au moins un `!`, `BREAKING CHANGE:` ou `BREAKING-CHANGE:` | major |
| Au moins un `feat`, sans rupture | minor |
| Au moins un `fix`, sans fonctionnalité ni rupture | patch |
| Seulement des changements techniques sans rupture | aucune |

Une rupture sur n'importe quel type compte, même en 0.x. La gravité d'un bug ne constitue
pas une rupture de compatibilité. `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `style`,
`revert` et `chore` ne produisent pas de version seuls. Si un revert est une correction
à livrer, employer `fix(scope): ...` et expliquer le revert dans le corps.

Le script complète d'abord le changelog et le JSON, puis appelle
`npm version <niveau> --no-git-tag-version --ignore-scripts`. Les hooks npm ne sont pas
exécutés afin de limiter les mutations aux fichiers de release. Il crée ensuite le commit
`chore(release): <version>` et le tag `v<version>`. Les hooks Git restent exécutés.
Aucun push, publication npm ou déploiement n'est déclenché.

Il exige un checkout attaché, les quatre fichiers de release suivis, aucun changement
suivi non committé, le tag courant dans l'ascendance et un historique complet. Les fichiers
personnels non suivis sont conservés et jamais ajoutés. Un échec avant commit restaure les
quatre fichiers et leur index. Si le commit a été créé mais pas le tag, le script conserve
le travail et indique comment terminer avec `git tag vX.Y.Z`, après vérification de HEAD.
Ne pas relancer un bump pour réparer un tag.

Le JSON est la source structurée des notes ; le changelog est son rendu Markdown. Les sujets
`feat`/`fix` deviennent les nouveautés/corrections. Le footer de rupture (ou le sujet avec
`!` sans footer) devient une note de changement incompatible. Écrire des sujets compréhensibles
par les joueurs. Les anciennes notes sont conservées. L'entrée 0.1.0 a été rédigée à partir
de son tag ; l'historique antérieur n'est pas automatiquement converti.

## CI et intégration

`npm run check:commits -- <base> <head>` valide les nouveaux messages de la plage. Sans
arguments, il utilise l'événement GitHub : base/head en PR, before/after en push, dernier
tag accessible pour une nouvelle branche. Les merges sont ignorés ; les messages squash
doivent aussi suivre la convention, car ils seront contrôlés au push.

`npm run check:release` vérifie package, lockfile, notes et changelog.
`npm run check:release -- --released` exige en plus le tag courant accessible et aucun
changement publiable depuis ce tag. Ce contrôle s'applique aux PR vers `main` et aux push
de `main` : préparer la release avant cette intégration.

La CI couvre `develop` et `main`, avec l'historique et les tags. L'intégration vers `main`
doit préserver le commit/tag de release (merge normal ou fast-forward, pas de squash qui
rendrait le tag inaccessible). Lors d'une publication autorisée, pousser la branche et son
tag ensemble, idéalement avec `git push --atomic` et des refs explicites, avant la PR vers main.
Les restrictions de diffusion du corpus restent applicables. Firebase Hosting reste limité
aux push de `main` ; préparer une release n'élargit pas l'autorisation de déployer.

## Workflow d'une publication

Le chemin habituel est : **fonctionnalités → develop → branche de release → main →
Firebase Hosting → synchronisation de develop**. `X.Y.Z` ci-dessous désigne la version
annoncée par le dry-run : remplacer cette valeur dans les noms de branche et de tag.
Ces étapes de push/déploiement ne s'appliquent que lorsque la publication est autorisée,
dans le respect des restrictions du corpus décrites dans les consignes du dépôt.

### 1. Rassembler les changements sur develop

Intégrer les fonctionnalités et corrections validées dans `develop`, avec des messages
Conventional Commits. Vérifier que la précédente release a été réintégrée depuis `main`
(étape 7), puis partir d'un dépôt sans modification suivie non committée :

```sh
git fetch origin --tags
git switch develop
git pull --ff-only origin develop
npm ci
npm run check:release
npm run release:prepare -- --dry-run
```

Relire le numéro calculé et les notes : les sujets des commits apparaîtront dans l'app.
Si le script n'annonce aucun changement publiable, aucune nouvelle version n'est nécessaire.
Corriger toute incohérence avant de poursuivre ; ne pas contourner le calcul avec un
`npm version` manuel ni modifier un tag de release existant.

### 2. Préparer la release sur une branche dédiée

```sh
git switch -c codex/release-X.Y.Z
npm run release:prepare
```

La commande complète le changelog et les notes, lance `npm version`, puis crée le commit
et le tag locaux. La branche isole le contenu à livrer ; les développements suivants
peuvent continuer sur `develop` sans entrer dans cette release.

### 3. Vérifier la version qui sera livrée

```sh
npm run check:release -- --released
npm test
npm run test:ng -- --watch=false
npm run validate:quotes
npm run validate:dernier-mot-dictionary
npm run build
git status --short
git show --stat vX.Y.Z
```

Tester aussi le build de production localement avec Firebase Emulator : accueil, routes
profondes, reprise de partie, mise à jour depuis une PWA installée et nouveautés après
rechargement. `npm start` ne permet pas de vérifier le service worker de production.
Le contrôle `validate:quotes` vérifie le schéma du corpus, **pas** ses droits de diffusion.

### 4. Pousser la branche et son tag, puis ouvrir la PR

```sh
git push --atomic origin codex/release-X.Y.Z refs/tags/vX.Y.Z
gh pr create --repo asirko/lets-ple --base main --head codex/release-X.Y.Z --title "chore(release): X.Y.Z"
```

Compléter la description de PR avec les nouveautés et les vérifications effectuées.
Le push de cette branche et du tag ne déploie rien. L'ouverture de la PR vers `main`
lance les contrôles CI, dont la présence du tag et l'absence de changement publiable
non versionné. Attendre tous les contrôles et la revue avant la fusion.

### 5. Fusionner vers main pour déclencher le déploiement

Utiliser **Create a merge commit** pour la PR de release : ni squash ni rebase, afin de
conserver le commit référencé par le tag dans l'ascendance de `main`.
La fusion produit un push sur `main` : la CI rejoue les validations, les tests et le build,
puis déploie `dist/portal/browser` sur Firebase Hosting si toutes les étapes réussissent.

Le script de préparation et le tag ne déclenchent donc pas le déploiement : **c'est le
push sur main**. La CI actuelle ne filtre pas les push de main selon les chemins modifiés :
même un commit documentaire sur main relance ce pipeline s'il passe les contrôles.

### 6. Confirmer le déploiement et le parcours joueur

Dans GitHub Actions, vérifier le run associé au **SHA fusionné sur main**, jusqu'à la
réussite de l'étape « Deployer sur Firebase Hosting ». Une PR verte ne prouve pas que
ce déploiement a réussi.

Sur l'application hébergée, vérifier l'accueil et une route profonde rechargée. Depuis
une PWA déjà installée, revenir au premier plan pour déclencher le check (limité à un
par minute), puis vérifier « Plus tard », la reprise de la mise à jour depuis l'accueil
et le rechargement volontaire. Les nouveautés doivent apparaître à l'accueil une seule
fois après acquittement, y compris si plusieurs versions ont été manquées.

### 7. Réintégrer la release dans develop

Après validation du déploiement, réintégrer `main` dans `develop` en conservant l'historique,
par une PR **main → develop**, fusionnée avec un merge commit. Cette étape rapporte
la version, le lockfile, les notes, le changelog et l'ascendance du tag sur `develop`.

Attendre les contrôles de cette PR et traiter explicitement les éventuels conflits ;
ne pas écraser les nouvelles fonctionnalités déjà présentes sur `develop`. Ne préparer
la release suivante qu'après cette synchronisation. La branche de release peut ensuite
être supprimée, mais conserver son tag.

### Si une étape échoue

- **Validation ou revue avant fusion :** ne pas fusionner. Corriger la branche de release
  avec un Conventional Commit. Si la correction est un `fix`, un `feat` ou une rupture,
  rejouer `release:prepare` : elle produit une nouvelle version et un nouveau tag. Pousser
  ce tag avec la branche, actualiser le titre de PR et recommencer les vérifications.
  Un tag déjà poussé n'est jamais déplacé ; il peut désigner une release finalement non déployée.
- **Déploiement échoué après fusion :** examiner le run correspondant. Pour une panne
  transitoire, relancer le job du même SHA sans bump de version. Si une correction du code
  est nécessaire, la faire passer par une nouvelle release ; ne pas réutiliser l'ancien numéro.
- **Régression après déploiement :** restaurer si nécessaire une release connue depuis
  l'historique Firebase Hosting, puis préparer la correction via le même workflow. Ce retour
  arrière d'hébergement ne réécrit ni Git ni les tags. Les PWA déjà ouvertes doivent aussi
  détecter et charger ce retour arrière ; il ne remplace pas instantanément leur code en mémoire.

## Parcours joueur

`PwaUpdateService` attend la stabilisation avant le premier check. Un retour visible relance
un check, au plus une fois par minute et sans appel concurrent. Seul `VERSION_READY` propose
la mise à jour ; les pannes réseau restent discrètes. Le service est inactif lorsque le
service worker est désactivé, notamment avec `npm start`.

« Mettre à jour » recharge la page courante. « Plus tard » et Échap conservent la session.
Le même hash n'est pas reproposé pendant cette session ; un bouton à l'accueil permet de
reprendre le choix. Un nouveau hash peut être proposé. Un futur lancement peut naturellement
charger la nouvelle version, même après un report. `unrecoverable` propose un rechargement
explicite, sans boucle automatique.

`ReleaseDialogs` attend la navigation initiale, laisse la priorité aux modales des jeux,
et n'affiche qu'une modale de version. Il reste silencieux dans le showcase.
La première visite affiche seulement les notes courantes ; ensuite, l'accueil affiche
toutes les versions manquées. Une arrivée dans un jeu garde les notes en attente. La fermeture
volontaire acquitte la version ; un rollback ne diminue pas ce marqueur. Aucun HTML des notes
n'est interprété. Les variantes sont dans `/dev/components/lp-update-dialog` et
`/dev/components/lp-release-notes-dialog`.

Les tests du script utilisent des dépôts temporaires et de vrais appels npm/Git. Les tests
Angular couvrent le choix, les versions sautées, le stockage indisponible et la coordination
des modales. Le service worker réel se vérifie avec deux builds successifs servis sur localhost.
