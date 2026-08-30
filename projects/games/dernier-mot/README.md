# Dernier Mot

Bibliothèque Angular lazy du jeu multijoueur local **Dernier Mot**. Les règles et leur rationale
sont documentés dans [`docs/reference/domain-dernier-mot.md`](../../../docs/reference/domain-dernier-mot.md).

## Organisation

```text
src/lib/domain/       réducteur et index mémoire TypeScript purs
src/lib/dictionary/   lecture locale de l'index, du manifeste et des définitions
src/lib/store/        façade signals et sauvegarde de la partie active
src/lib/ui/           composants de présentation et écrans d'assemblage
src/styles/           module SMACSS chargé avec la route lazy
tools/                import streaming, génération et validation du corpus
```

## Sources et attribution du corpus versionné

Le fichier [`manifest.json`](../../../content/dictionaries/dernier-mot/manifest.json) est la source
de vérité affichée dans l'écran de crédits. Le corpus actuel contient **47 920 entrées**.
`generatedAt` vaut `2026-08-29T22:58:00.000Z` : ce n'est pas l'heure d'exécution du générateur,
mais une date de référence déterministe, égale à l'instant de collecte le plus récent parmi les
sources.

| Source                                                                                                         | Rôle                             | Collecte                   | Licence                                                         | SHA-256 du fichier brut                                            |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Lexique 4](https://lexique.org/databases/Lexique400/Lexique400.tsv)                                           | lemmes, catégories et fréquences | `2026-08-29T22:57:34.000Z` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | `fe333b4f9e1797f23922d5863cde28635ee13685813af0f9b4b4b9f7d4610a5a` |
| [Wiktionnaire français, extraction Wiktextract](https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz) | graphies et définitions          | `2026-08-29T22:58:00.000Z` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | `f7c1756aa2e07b21e255d154f9ec9b51a1d8da126896b22dc7ac5873efa17c05` |

**Lexique 4.** Créateurs : Boris New, Christophe Pallier, Gauvain Schalchli, Jessica Bourgin et
Manuel Gimenes. Citation : New, B., Pallier, C., Schalchli, G., Bourgin, J., & Gimenes, M. (2026).
_Lexique 4: A major upgrade of the Lexique French lexical database_. Behavior Research Methods,
58(5), Article 140. [DOI 10.3758/s13428-026-02967-5](https://doi.org/10.3758/s13428-026-02967-5).

**Wiktionnaire français.** Les définitions sont attribuées aux contributeurs de chaque article.
Le manifeste conserve les patrons `https://fr.wiktionary.org/wiki/{title}` pour la source et
`https://fr.wiktionary.org/w/index.php?title={title}&action=history` pour leur liste d'auteurs,
ainsi qu'un lien vers les
[conditions officielles de réutilisation](https://fr.wiktionary.org/wiki/Wiktionnaire:R%C3%A9utilisation_du_contenu_du_Wiktionnaire).
Le dump structuré vient de [Wiktextract](https://github.com/tatuylonen/wiktextract), créé par Tatu
Ylonen et distribué sous [licence MIT](https://github.com/tatuylonen/wiktextract/blob/master/LICENSE).

**Adaptation Let's Plé.** Le corpus est une adaptation : sélection de lemmes, exclusion des formes
fléchies et graphies non alphabétiques, normalisation de la casse, des accents et des ligatures,
fusion des homographes normalisés, construction d'un index de préfixes et découpage des définitions
par initiale. Cette adaptation est distribuée sous
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), comme les données sources.

Les fichiers bruts et leur `sources.json` vivent sous `content/dictionary-sources/` et sont
gitignorés. Les dérivés versionnés conservent noms, créateurs, citation, URL, dates, licences,
mécanisme d'attribution des contributeurs, transformations et empreintes dans le manifeste. Une
nouvelle génération calcule les empreintes depuis les fichiers réellement utilisés. Les dates
`retrievedAt` proviennent de `sources.json` puis sont validées ; les faits stables d'attribution
sont ajoutés par le générateur et validés avant publication.

## Filtre effectif

Le lecteur Lexique repère ses colonnes par en-tête et parcourt le TSV ligne par ligne. Le générateur
conserve les catégories `NOM`, `ADJ`, `VER` et `ADV` lorsque la graphie alphabétique minuscule
correspond au lemme après normalisation et comporte au moins trois lettres. Pour les noms, seules
les entrées de nombre singulier ou invariable sont admises. Cette égalité graphie/lemme écarte
notamment pluriels et formes conjuguées.

Le lecteur Wiktextract accepte les fichiers JSONL bruts ou gzip, ne conserve que `lang_code: fr`,
les POS `noun`, `adj`, `verb` et `adv`, et préserve pour chaque sens ses `tags` et références
`form_of`. Le générateur ignore les sens marqués `form-of` ou rattachés à une autre forme, puis
n'attache les gloses restantes que si la graphie normalisée existe déjà dans la sélection Lexique.
Pour les rares sens non balisés par Wiktextract, les formulations explicites d'inflexion
(personne et temps, participe, forme fléchie ou conjuguée) sont également écartées. Ce contrôle
ciblé retire les définitions de conjugaisons sans supprimer les sens canoniques d'un homographe,
même lorsque Lexique et le Wiktionnaire classent différemment ce sens, par exemple les sens nominaux
et adjectivaux de « porte ». Les espaces, apostrophes, traits d'union et autres caractères non
alphabétiques sont exclus.

La normalisation retire les accents, met en majuscules et développe `œ`/`æ`. Les homographes
normalisés partagent une clé, mais leurs graphies et gloses restent groupées pour l'affichage.

## Génération

```bash
npm run build:dernier-mot-dictionary -- \
  --lexique content/dictionary-sources/Lexique400.tsv \
  --wiktionary content/dictionary-sources/fr-wiktionary.jsonl.gz \
  --sources-manifest content/dictionary-sources/sources.json

npm run validate:dernier-mot-dictionary
```

Le générateur écrit de manière déterministe :

- `manifest.json`, schéma 1 et attribution ;
- `index.json`, table triée de **159 570 préfixes** avec statut de mot, descendants et lettres
  suivantes ;
- `definitions/A.json` à `definitions/Z.json`, chargés seulement lorsqu'une définition est
  demandée.

La validation recalcule les 47 920 mots, tous les préfixes, compteurs de descendants et lettres
suivantes. Elle contrôle aussi l'ordre, les références de définitions, les 26 chunks exacts, les
graphies admissibles, les dates RFC 3339, les URL HTTPS, les licences, l'attribution, l'indication
des transformations et les SHA-256.

## Vérification et build

```bash
npm test                         # domaine et tools avec Vitest
npm run test:ng -- dernier-mot  # service, store et UI Angular
npm run build:dernier-mot       # ui + game-core + library isolée
npm run build                   # portail et chunk lazy du jeu
```

Le portail copie `content/dictionaries/dernier-mot/` tel quel. Son service worker place tout le
dossier dans un groupe `installMode: lazy` / `updateMode: lazy` : l'index est demandé à l'entrée du
jeu, les définitions par initiale seulement au moment d'un résultat.
