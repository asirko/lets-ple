# Accueil Focus

L'accueil du worktree `codex/home-design-variants` utilise la direction Focus,
inspirée de [Linear](awesome-design-md/design-md/linear.app/DESIGN.md) :
fond noir, panneaux sombres, bordures fines et accent lavande.

## Aperçu

- Accueil : http://127.0.0.1:4307/
- Showcase : http://127.0.0.1:4307/dev/components/lp-home-concept

Lancer `npm start` dans le worktree réutilise le port 4307, réservé dans
`.worktree-port`. Le serveur existant écoute sur `127.0.0.1`.
Les anciens paramètres `?design=...` n'affectent plus la présentation.

## Catalogue

Le catalogue est le contenu principal : pas de bandeau promotionnel, de slogans
ni de sélecteur de direction. Toutes les cartes ont le même niveau d'importance.
La grille passe de trois à deux puis une colonne selon la largeur.

`HomePage` transmet `GAME_REGISTRY` à `LpHomeConcept`. La recherche locale
filtre les titres, descriptions, thèmes et mentions solo / à plusieurs.
Chaque mot saisi doit être présent, sans tenir compte des accents, de la casse
ou des espaces superflus. Le compteur annonce les résultats ; une recherche vide
ou effacée restitue tout le catalogue. Échap efface la saisie et garde le focus.

Les illustrations existantes restent associées aux trois jeux. Un nouveau jeu
sans illustration spécifique reçoit une vignette basée sur son titre.
Le showcase propose aussi un catalogue vide et 24 jeux de démonstration pour
contrôler la mise en page sans modifier les vrais jeux.

Les styles restent dans le module global `_home-concept.scss`.
Les références Awesome Design sont conservées sans modification depuis
le commit `f6961238d5cddcf8042a74a70fc400ec67181abb` de
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md),
avec leur licence MIT.

## Vérification

- 35 tests du portail passent, dont recherche multi-mots, accents et réinitialisation.
- Build de production réussi.
- Chromium : rendu à 320, 390, 768 et 1440 px sans débordement horizontal.
- Recherche, clavier, état vide et catalogue étendu vérifiés dans le navigateur.
- Captures et scripts temporaires dans `.angular/`, ignorés par Git.

Les dépendances sont réutilisées par jonction vers le checkout principal.
Ne pas installer ou modifier de dépendances via cette jonction.

