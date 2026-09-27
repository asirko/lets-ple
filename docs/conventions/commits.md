# Convention commits

Conventional Commits est obligatoire pour tout nouveau commit et message de squash.
Cette convention pilote les versions et les notes joueur. La CI valide les nouveaux
messages sur `develop` et `main` ; la préparation de release refuse les messages invalides.

## Format du sujet

```
type(scope): sujet court, sans accents
```

- **`type`** — `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `build`, `ci`, `perf`, `style`, `revert`. Choisi pour ce qu'apporte le
  commit, pas pour le fichier touché (un nouveau test qui prouve une règle du moteur est `test`,
  pas `feat`, même s'il ajoute aussi de l'implémentation).
- **`scope`** — obligatoire pour `feat`/`fix`/`test`/`refactor`/`perf`. Il doit
  **prioritairement contenir le nom du jeu concerné** : `cryptogramme`, `dernier-mot`,
  `quiz`… Cette priorité s'applique aussi aux changements de moteur, d'interface, de tests
  ou d'outils propres à ce jeu. Si une précision technique est utile, conserver le nom du
  jeu en premier : `cryptogramme/domain`, `quiz/ui`. Pour les changements partagés entre
  plusieurs jeux ou transversaux au dépôt, utiliser la zone commune : `ui`, `game-core`,
  `portal`, `tools`, `release`… Le scope reste facultatif pour les autres types transversaux,
  par exemple `chore(release): 0.2.0`.
- **`sujet`** — en français, minuscule, sans point final, **sans accents** (`generateur`,
  `difficulte`, `reducteur`, `separe`) même si le corps du commit et le reste de la documentation
  du projet sont en français accentué correct. C'est délibéré : évite tout risque d'encodage
  cassé sur un terminal ou un outil qui affiche mal l'UTF-8 dans un sujet de commit.

Exemples : `feat(cryptogramme): ajoute une regle de pioche`,
`test(cryptogramme/domain): verifie la solvabilite`, `fix(quiz): corrige les choix proposes`,
`fix(ui): corrige le focus des modales partagees`, `docs: precise les conventions de commit`.

## Corps

Le corps n'est pas systématique, mais dès qu'un commit encode une décision non évidente, il
explique le **pourquoi**, jamais un résumé du diff (le diff se lit tout seul) :

```
Avec seulement 2 ou 3 cadeaux, un tirage uniforme tomberait souvent sur
un hapax et n'offrirait aucune prise. Les symboles a occurrence unique
sont ecartes, le tirage se limite au tiers superieur par frequence, et
une voyelle est garantie.
```

Deux usages reviennent dans l'historique, à réutiliser selon le cas :

- **Rationale de règle** — pourquoi cette valeur/cette règle plutôt qu'une autre évidente
  (ex. `2fa815e`, `2695f7e`, `6588731`).
- **Note de vérification** — ce qui a été rejoué pour confirmer l'absence de régression
  (ex. `cfccf04` : *« Vérifié sans régression : ng build ui/cryptogramme, build-storybook, 0
  violation axe-core sur les 20 stories, 0 erreur console »*), utile quand le changement est
  visuel/UI et ne peut pas être prouvé par un test unitaire seul.

Le corps, contrairement au sujet, garde les accents.

## Ruptures et releases

Déclarer toute rupture avec `!` après le type/scope, ou un footer `BREAKING CHANGE:`
(`BREAKING-CHANGE:` également accepté). Décrire l'effet utilisateur et la migration :

```text
feat(portal)!: change les preferences enregistrees

BREAKING CHANGE: Les anciennes préférences doivent être choisies à nouveau.
```

Rupture => major ; sinon `feat` => minor ; sinon `fix` => patch. Les commits techniques
seuls ne créent pas de version. Cette règle vaut aussi en 0.x, et pour une rupture portée
par un type autre que `feat`. Les sujets feat/fix alimentent les notes joueur : décrire
le bénéfice ou la correction, garder le pourquoi détaillé dans le corps.

Préparer avec `npm run release:prepare -- --dry-run`, puis `npm run release:prepare`.
Voir [le processus et les contrôles CI](../reference/releases.md).

## Exceptions historiques — à ne pas reproduire

`83062c8` (« ts config des tools ») et `7b28f86` (« difficulties + quote DB + conf ») ne suivent
pas le format `type(scope):`. Ce sont des dérogations, pas une alternative valide — tout nouveau
commit doit suivre le format ci-dessus.
