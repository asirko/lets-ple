# Règles et domaine de Dernier Mot

Ce document est la référence durable des règles de **Dernier Mot** et de leur motivation. La
structure de la bibliothèque et le pipeline du corpus sont décrits respectivement dans
[`architecture.md`](architecture.md) et le
[`README` du jeu](../../projects/games/dernier-mot/README.md).

## Intention

Dernier Mot est un jeu compétitif en présentiel sur un seul téléphone. À tour de rôle, les joueurs
ajoutent une lettre à droite d'un préfixe commun. Le téléphone circule seulement après la modale de
résultat : le plateau reste visible, mais aucune autre lettre ne peut être jouée pendant cette
transition.

Le jeu récompense deux contributions différentes : découvrir un mot qui peut encore être prolongé
et fermer la branche du dictionnaire avec un mot terminal. Une erreur coûte un point et élimine de
la manche ; survivre seul n'accorde volontairement aucun bonus, car personne ne doit pouvoir
marquer en jouant sans adversaire.

## Mise en place et rotation

- Au moins deux pseudonymes non vides et uniques sans tenir compte de la casse sont requis. Il n'y
  a pas de maximum imposé par les règles.
- L'ordre de saisie reste l'ordre de rotation pendant toute la partie.
- Le premier joueur de la première manche est tiré de façon pseudo-aléatoire à partir d'une graine.
- Les joueurs éliminés sont sautés jusqu'à la fin de la manche et redeviennent tous actifs à la
  manche suivante.
- Après un mot terminal, le joueur qui suit son auteur dans l'ordre initial commence.
- Après une fin par éliminations, le seul joueur encore actif commence.

La graine rend le tirage initial reproductible dans les tests sans réordonner durablement les
participants. Les deux règles de redémarrage évitent à la fois de récompenser artificiellement le
dernier survivant et de donner systématiquement la main au même joueur.

## Préfixes et dictionnaire

Le clavier propose `A` à `Z` et les lettres sont toujours ajoutées à droite. La comparaison met en
majuscules, retire les diacritiques et développe les ligatures `œ` en `OE` et `æ` en `AE`. Une
graphie accentuée reste disponible pour l'affichage de sa définition, mais toutes ses variantes
normalisées partagent la même réponse jouable.

Pour chaque préfixe, le dictionnaire fournit trois informations indépendantes :

- `isWord` : le préfixe est lui-même une entrée jouable ;
- `continuationCount` : nombre de mots strictement plus longs qui commencent par ce préfixe ;
- `nextLetters` : lettres qui conservent au moins une continuation.

Cette distinction est essentielle : `CHAT` peut être un mot intermédiaire si `CHATON` existe,
tandis qu'un mot dont `continuationCount` vaut zéro est terminal. Un préfixe qui n'est pas encore
un mot reste légal dès lors qu'au moins une continuation existe.

## Résolution d'un tour

| Résultat          | Effet sur le préfixe                  |          Score | Suite                |
| ----------------- | ------------------------------------- | -------------: | -------------------- |
| Préfixe jouable   | la lettre est conservée               |              0 | joueur actif suivant |
| Mot intermédiaire | le mot est conservé                   |             +1 | joueur actif suivant |
| Lettre invalide   | la tentative est montrée puis rejetée | -1, plancher 0 | auteur éliminé       |
| Mot terminal      | le mot est conservé                   |    +3 au total | fin de manche        |

Un mot terminal vaut trois points, et non le point intermédiaire plus trois. Une lettre invalide ne
corrompt pas le chemin commun : le joueur suivant repart du dernier préfixe accepté.

Quand l'acquittement d'une élimination ne laisse qu'un joueur actif, la manche se termine sans
vainqueur de manche ni bonus. Le dictionnaire révèle jusqu'à cinq complétions du préfixe conservé,
triées par longueur croissante, puis fréquence décroissante, puis ordre alphabétique.

## Fin de partie

Le score cible est **10 points**. Il n'est vérifié qu'à la fin complète d'une manche : atteindre dix
pendant un tour ne coupe jamais la manche.

Dès qu'au moins un score atteint dix, le score maximal désigne la victoire. Tous les joueurs ayant
exactement ce maximum gagnent ex æquo ; il n'y a pas de mort subite. Ainsi, `12 / 10 / 7` produit
un seul gagnant, tandis que `12 / 12 / 10` en produit deux.

## Modèle de domaine

`domain/game.ts` est un réducteur TypeScript pur et immuable. Ses phases sont :

- `turn` : une lettre peut être jouée ;
- `turn-result` : la modale doit être acquittée avant le joueur suivant ;
- `round-result` : tableau des scores et démarrage explicite de la manche suivante ;
- `game-over` : résultat final et possibilité de repartir du setup.

`PLAY_LETTER`, `ACKNOWLEDGE_RESULT` et `START_NEXT_ROUND` sont les seules actions. Les composants et
la façade signals ne recalculent aucune règle. La restauration refuse notamment une version
inconnue, un préfixe impossible, une résolution incohérente, des scores négatifs, des joueurs ou
gagnants incompatibles avec la phase et des identifiants dupliqués.
