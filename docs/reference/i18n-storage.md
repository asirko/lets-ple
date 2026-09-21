# i18n et storage

Les chaînes d'interface ne sont jamais en dur dans les templates — tout passe par `I18nService`,
qui résout des clés depuis des dictionnaires JSON (`i18n/fr.json`), interpole `{n}`, et retombe sur
la clé brute si elle est absente (une clé manquante doit se voir, jamais planter l'app). Français
uniquement pour l'instant, mais l'indirection est délibérée : ajouter une langue plus tard revient à
ajouter un dictionnaire et un corpus, pas à toucher les composants. Chaque citation du corpus porte
aussi un champ `lang`.

`@angular/localize` est écarté : sa compilation par langue est disproportionnée pour un besoin de
bascule à l'exécution, pas de build séparé par locale.

Les crédits de Dernier Mot utilisent le préfixe de clés `dernierMot.credits.*`. Les noms de source,
créateurs, citations, URL, dates, licences et transformations ne sont pas traduits ni dupliqués dans
ce dictionnaire : ils proviennent du `content/dictionaries/dernier-mot/manifest.json` généré, puis
seuls les libellés de présentation passent par `I18nService`.

`StorageService` enveloppe `localStorage` derrière des clés versionnées et préfixées
(`letsple:v1:`), portant un `schemaVersion` qui permettra une migration future du format stocké. Il
retombe sur une carte en mémoire quand `localStorage` est indisponible (navigation privée). Ce qui
y est stocké : progression, statistiques par jeu, préférences (mode accents, thème) et partie locale
en cours. Aucune donnée ne quitte l'appareil et aucun backend n'est appelé.

Dernier Mot persiste après chaque transition la partie active sous la clé logique
`dernierMot:activeMatch`, soit la clé `localStorage` complète
`letsple:v1:dernierMot:activeMatch`. L'objet `GameState` porte lui aussi `version: 1`. Une version
inconnue, un JSON illisible ou un état qui ne respecte plus les invariants du dictionnaire et de la
phase est ignoré : l'application revient au setup. « Refaire une partie » supprime cette clé. Les
pseudonymes, scores, préfixe, éliminations et tour courant restent exclusivement sur l'appareil ; le
fallback mémoire conserve le même contrat lorsque `localStorage` est indisponible.

Cryptogramme persiste l'état après chaque action sous `letsple:v1:cryptogramme:activeGame`.
La sauvegarde versionnée inclut la citation et son attribution, la graine, le plateau, les
correspondances, la pioche, la main, les erreurs, la sélection et les limites de longueur.
Les correspondances sont sérialisées en paires puis reconstruites en `Map`. Au chargement,
le puzzle est reconstruit depuis la graine et les invariants du plateau et de l'inventaire sont
vérifiés ; une sauvegarde corrompue est ignorée. Des filtres invalides sont remis à zéro sans
perdre la partie. La reprise est immédiate même si le chargement du catalogue échoue ; un bouton
permet de réessayer ce chargement pour accéder aux autres citations. Un quota dépassé ou un
stockage bloqué n'interrompt pas le jeu.
