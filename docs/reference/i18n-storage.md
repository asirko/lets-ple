# i18n et storage

Les chaînes d'interface ne sont jamais en dur dans les templates — tout passe par `I18nService`,
qui résout des clés depuis des dictionnaires JSON (`i18n/fr.json`), interpole `{n}`, et retombe sur
la clé brute si elle est absente (une clé manquante doit se voir, jamais planter l'app). Français
uniquement pour l'instant, mais l'indirection est délibérée : ajouter une langue plus tard revient à
ajouter un dictionnaire et un corpus, pas à toucher les composants. Chaque citation du corpus porte
aussi un champ `lang`.

`@angular/localize` est écarté : sa compilation par langue est disproportionnée pour un besoin de
bascule à l'exécution, pas de build séparé par locale.

`StorageService` enveloppe `localStorage` derrière des clés versionnées et préfixées
(`letsple:v1:`), portant un `schemaVersion` qui permettra une migration future du format stocké. Il
retombe sur une carte en mémoire quand `localStorage` est indisponible (navigation privée). Ce qui
y est stocké : progression, statistiques par jeu, préférences (mode accents, thème). Aucune donnée
personnelle, aucun backend.
