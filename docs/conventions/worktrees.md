# Convention de worktrees : un sujet, un espace isolé

Tout sujet — issue GitHub ou chantier libre — s'ouvre dans un worktree git dédié, créé par
`npm run ticket`. Le dépôt principal reste ainsi toujours sur `main` et disponible, et deux sujets
peuvent tourner en parallèle sans se marcher dessus.

```bash
npm run ticket 42              # issue GitHub : branche 42-<titre>, contexte de l'issue imprimé
npm run ticket refacto-css     # sujet libre, sans issue
```

## Ce que la commande fait

`scripts/ticket.ts` enchaîne en un appel ce qui demandait sinon une demi-douzaine de commandes :

1. **Contexte.** Argument numérique : `gh issue view` récupère titre, corps, labels et jalon. Le nom
   de branche devient `<numéro>-<titre slugifié>`. Argument texte : le slug sert tel quel.
2. **Worktree.** `git worktree add .claude/worktrees/<branche>` à partir de `main`. Si la branche
   existe déjà, elle est reprise plutôt que recréée.
3. **Dépendances.** Le `node_modules` du worktree est une **jonction** vers celui de la racine :
   instantané, aucun octet de disque, là où un `npm ci` coûterait une à trois minutes et ~800 Mo à
   chaque sujet. Si le `package-lock.json` de la branche diffère de celui de la racine, le script
   bascule tout seul sur un vrai `npm ci` — les dépendances y sont alors réellement différentes.
4. **Port.** Premier port libre dans 4201-4299, ni réservé par un autre worktree ni occupé sur la
   machine, écrit dans `.worktree-port` (gitignoré). Le dépôt principal garde 4200.
5. **Résumé.** Branche, chemin, port et contexte de l'issue en un seul bloc — c'est tout ce qu'un
   agent a besoin de lire pour démarrer, au lieu d'explorer le dépôt et l'issue commande par
   commande.

Relancer `npm run ticket` sur un sujet déjà ouvert ne casse rien : la commande rappelle ces
informations, et attribue un port au passage si le worktree n'en avait pas encore.

## Servir l'application

Dans un worktree, `npm start` sert sur le port réservé sans argument supplémentaire : le wrapper
`scripts/serve.ts` lit `.worktree-port` et le passe à `ng serve`. À la racine, où ce fichier
n'existe pas, on retombe sur 4200.

## Ne jamais lancer `npm install` dans un worktree

Son `node_modules` est une jonction : une installation écrirait dans le dépôt principal et
contaminerait tous les autres sujets. Quand une branche doit vraiment changer de dépendances :

```bash
npm run ticket:deps            # depuis le worktree : détache la jonction, installe pour de bon
```

Le worktree devient alors autonome (~800 Mo), et le script détecte la divergence de
`package-lock.json` aux ouvertures suivantes.

## Fin de sujet

```bash
npm run ticket:clean <branche> # retire la jonction puis le worktree ; la branche survit
```

La commande refuse de retirer un worktree portant du travail non commité — c'est voulu. Retirer la
jonction ne touche jamais au `node_modules` de la racine : `unlinkSync` sur une jonction Windows
supprime le lien, pas sa cible.
