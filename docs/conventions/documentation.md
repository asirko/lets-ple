# Convention de documentation

Cycle de vie entre conception et documentation durable, pour que `docs/reference/` et `CLAUDE.md`
restent la source de vérité et que `docs/superpowers/` ne redevienne pas un dépôt chronologique
avec le temps.

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

## Quand un doc de référence devient obsolète

`docs/reference/*.md` décrit l'état **actuel** du système, pas son historique. Quand une
implémentation change ce qu'un doc de référence décrit (ex. remplacement de Storybook par un
showcase maison), mettre à jour ce doc fait partie de la même tâche que le code — pas une tâche à
part, pas un « TODO doc » différé.
