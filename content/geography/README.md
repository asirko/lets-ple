# Données du quiz géographie

Base dérivée de mledoze/countries distribuée sous **ODbL-1.0** ; drapeaux flag-icons
sous MIT ; géométries Natural Earth dans le domaine public. Voir les deux fichiers
LICENSE et `manifest.json` pour les sources et versions exactes.

La provenance, les transformations, les exclusions, la couverture et la commande
de régénération sont documentées dans
[`docs/reference/domain-quiz-geographie.md`](../../docs/reference/domain-quiz-geographie.md).

Les JSON et SVG sont générés par
`projects/games/quiz/tools/prepare-geography.ts`. Ne pas corriger le JSON à la main :
adapter la préparation, puis exécuter `npm run prepare:geography` et `npm test -- quiz`.
