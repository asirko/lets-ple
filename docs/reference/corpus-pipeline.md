# Corpus et pipeline de citations

Le corpus vit dans `content/quotes/*.json`, un fichier JSON par thème (`litterature`,
`historique`, `scientifique`, `pop-culture`), édité à la main et validé contre
`projects/games/cryptogramme/tools/quote-schema.ts` par
`projects/games/cryptogramme/tools/validate-quotes.ts` (`npm run validate:quotes`) : unicité de
`id`, `author`/`source` non vides, `notoriety` de 1 à 5, `publicDomain` obligatoire.

```json
{
  "id": "hugo-histoire-crime-01",
  "lang": "fr",
  "text": "Rien n'est plus puissant qu'une idée dont l'heure est venue.",
  "author": "Victor Hugo",
  "source": "Histoire d'un crime, 1877",
  "theme": "litterature",
  "notoriety": 4,
  "publicDomain": true
}
```

**`source` et `publicDomain` sont obligatoires, pas optionnels** : la conformité au droit de
citation en dépend. Voir l'AVERTISSEMENT en tête de `CLAUDE.md` — `publicDomain` est aujourd'hui le
seul filtre légitime pour ce qui peut être exposé publiquement, et le code ne l'exploite pas encore
à l'exécution ; ne pas déployer publiquement tant que ce point n'est pas réglé.

## Score de difficulté

`projects/games/cryptogramme/tools/difficulty.ts` calcule un score composite, avec des poids
externalisés dans `difficulty-weights.json` (même dossier) pour pouvoir être recalibrés sans
changement de code :

| Facteur | Effet sur la difficulté |
|---|---|
| Occurrences moyennes par symbole distinct | ↑ = plus **facile** (davantage de contexte) |
| Part des symboles rares (K W X Y Z Q J, accents peu fréquents) | ↑ = plus dur |
| Mots de 1 à 3 lettres (à, y, le, de, et…) | ↑ = plus **facile** : ce sont les points d'entrée |
| Écart aux fréquences standard du français | ↑ = plus dur : l'analyse fréquentielle ne mord plus |
| Nombre de symboles distincts | ↑ = plus dur, et pioche plus longue |
| Notoriété de la citation | champ manuel, ↑ = plus facile |

`npm run score:quotes` recalcule et réécrit le bloc `difficulty: { score, tier, factors }` dans
chaque fichier de `content/quotes/*.json` — c'est pré-calculé à l'édition, jamais recalculé à
l'exécution. Les tests de ce module vérifient des propriétés de monotonie (« plus de symboles rares
⇒ score plus haut »), pas des valeurs fixes, puisque les poids sont amenés à bouger pendant
l'équilibrage.

`score` est normalisé sur 0-100 (`computeScore` clampe le résultat pondéré à cet intervalle) et
`tier` découpe ce score en cinq paliers de 20 points (`toTier` dans `difficulty.ts`) : 1 = [0, 20[,
2 = [20, 40[, 3 = [40, 60[, 4 = [60, 80[, 5 = [80, 100]. `score-quotes.ts` calcule systématiquement
ce score en `accentMode: 'distinct'` — c'est donc sur ce mode que le calibrage des poids est fait ;
le mode `merged` (moins de symboles distincts, car les lettres accentuées y sont fusionnées avec
leur base) n'est pas noté séparément par le pipeline actuel.

## Pipeline d'extraction QuoteKG

`projects/games/cryptogramme/tools/extract-quotekg-citations.ts` (`npm run extract:quotes`) tire
des citations françaises candidates depuis le endpoint SPARQL public de
[QuoteKG](https://quotekg.l3s.uni-hannover.de) — un graphe de connaissance dérivé de Wikiquote, déjà
structuré (texte séparé du contexte, langue taguée, page source traçable). Il a remplacé une
première version qui parsait le wikitext brut de Wikiquote, plus bruitée (commentaires et résidus
de balisage mêlés au texte).

QuoteKG n'est pas sans bruit non plus : le signal le plus fiable observé est que la fiabilité du tag
de langue corrèle avec le Wikiquote d'hébergement — les mentions taguées `fr` mais hébergées sur un
Wikiquote non-fr/en (bg, it, nl, ja, la...) sont mesurablement plus souvent mal étiquetées. Le script
ne garde donc que les mentions sourcées depuis `fr.wikiquote.org` ou `en.wikiquote.org`
(`isAllowedSource`). La longueur n'est délibérément **pas** filtrée — les citations très longues font
des cryptogrammes plus difficiles et intéressants, elles sont gardées ; seul un plancher de contenu
alphabétique minimal s'applique (`isAcceptableQuote`, réutilise `MIN_ALPHA_LENGTH` de
`validate-quotes.ts`) pour écarter les fragments. `theme`/`notoriety`/`publicDomain` n'existent
encore dans aucune source automatisée — la sortie de ce script (`quotekg-citations.json`, ignoré par
git) n'est pas encore une pipeline validée, une revue manuelle lourde reste nécessaire avant que
quoi que ce soit rejoigne `content/quotes/`.

Chaque mention brute porte aussi un score `quality` (0-1), ajouté par un run Workflow ponctuel (135
lots d'environ 100 citations, notées par des agents Haiku selon une grille 1.0/0.5/0.0 : citation
parfaite / encore des symboles ou du balisage résiduels / incompréhensible ou mauvaise langue). Un
échantillonnage manuel par tranche de score a confirmé qu'il sépare bien le signal du bruit : sous
~0.3 c'est presque uniquement du latin mal étiqueté français, des titres d'œuvres ou des fragments
tronqués ; 0.3–0.7 c'est en majorité authentique mais de l'ancien/moyen français archaïque
(Rabelais, Deschamps) qui se lit « correct mais risqué pour le jeu » ; au-dessus de 0.7 c'est de
manière fiable une citation complète et cohérente. La **longueur des citations ne corrèle pas avec
le bruit** — les citations sous 100 caractères scorent moins bien en moyenne (0.88, 10% sous 0.5)
que n'importe quelle tranche plus longue (toutes ≥300 caractères moyennent 0.96+), ce qui confirme
sur le plan de la qualité — pas seulement de la difficulté — que retirer le plafond de longueur
était le bon choix.

`projects/games/cryptogramme/tools/filter-quotekg-candidates.ts` (`npm run filter:quotes`) applique
un seuil de `quality` (0.7 par défaut, `filterCandidates`) au dump brut et écrit le résultat dans
`content/quote-candidates/quotekg.json` — contrairement au dump brut, ce fichier **est** versionné :
c'est une short-list déjà revue qui mérite d'être conservée, même si ce n'est toujours pas un
`Quote[]` validé (même trou `theme`/`notoriety`/`publicDomain`). Ne pas confondre
`content/quote-candidates/` avec `content/quotes/` — le premier est une short-list pré-curation, le
second est ce que `validate-quotes.ts` et le jeu consomment réellement.
