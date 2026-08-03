# Convention commits

Extraite de l'historique réel du dépôt (`git log`), pas d'un standard imposé d'avance — à suivre
pour rester cohérent avec ce qui existe déjà.

## Format du sujet

```
type(scope): sujet court, sans accents
```

- **`type`** — `feat`, `fix`, `test`, `docs`, `refactor`, `chore`. Choisi pour ce qu'apporte le
  commit, pas pour le fichier touché (un nouveau test qui prouve une règle du moteur est `test`,
  pas `feat`, même s'il ajoute aussi de l'implémentation).
- **`scope`** — présent pour `feat`/`fix`/`test`/`refactor`, et correspond à la zone touchée :
  `domain`, `tools`, `ui`, `cryptogramme`, `storybook`, `game-core`, `portal`… Absent pour
  `docs`/`chore`, qui sont en général transversaux (pas une seule zone naturelle).
- **`sujet`** — en français, minuscule, sans point final, **sans accents** (`generateur`,
  `difficulte`, `reducteur`, `separe`) même si le corps du commit et le reste de la documentation
  du projet sont en français accentué correct. C'est délibéré : évite tout risque d'encodage
  cassé sur un terminal ou un outil qui affiche mal l'UTF-8 dans un sujet de commit.

Exemples réels : `feat(domain): reducteur du jeu`, `test(domain): invariants, solvabilite et
verrou d'architecture`, `fix(storybook): resout les alias @lets-ple/* dans vite`,
`docs: convention CSS SMACSS et reference dans CLAUDE.md`.

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

## Exceptions historiques — à ne pas reproduire

`83062c8` (« ts config des tools ») et `7b28f86` (« difficulties + quote DB + conf ») ne suivent
pas le format `type(scope):`. Ce sont des dérogations, pas une alternative valide — tout nouveau
commit doit suivre le format ci-dessus.
