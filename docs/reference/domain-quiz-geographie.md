# Quiz géographie

Le troisième jeu du portail est chargé à la demande sous `/quiz`. Une partie
contient dix questions, deux de chacun des cinq types disponibles : silhouette,
drapeau, pays depuis sa capitale, capitale d’un pays et frontières terrestres.
Les dix pays sont distincts et deux catégories consécutives diffèrent.

## Règles et état

Le joueur choisit Cash (5 points), Carré (3) ou Duo (1) à chaque question. Ce choix
est définitif : montrer les propositions puis revenir en Cash fausserait le score.
Une mauvaise réponse rapporte zéro. Une réponse doit appartenir au domaine
attendu ; une faute inconnue en Cash reste éditable avec une erreur explicite.
La correction attend une action « Question suivante ». Après la dixième
correction, le résultat affiche score sur 50, bonnes et mauvaises réponses.
Rejouer génère une nouvelle partie et remet tous les compteurs à zéro.

`domain/game.ts` est un réducteur immuable avec les phases `choosing`, `answering`,
`correction` et `finished`. Les soumissions répétées, changements de mode après
sélection, propositions absentes et avances prématurées ne changent pas l’état.
`store/quiz.store.ts` adapte ce moteur aux signals sans reproduire les règles.
L’état reste en mémoire ; aucun compte ni persistance n’est ajouté dans ce MVP.

## Données locales

`content/geography/countries.json` contient 195 États (193 membres de l’ONU,
Vatican et Palestine). Le périmètre est explicite, pas une liste exhaustive de
tous les territoires ISO. Chaque entrée porte ISO2, ISO3, nom français et alias,
`capitals[]`, alias des capitales, région/sous-région, frontières ISO3, fichier SVG
du drapeau et éventuellement géométrie GeoJSON Polygon/MultiPolygon.

Sources et versions sont enregistrées dans `manifest.json` :

- [mledoze/countries](https://github.com/mledoze/countries), commit
  `c8015eebdd94c533358406b0d709f441389e1f2e`, sous ODbL-1.0.
- [Natural Earth](https://www.naturalearthdata.com/), version 5.1.2, carte 1:110m,
  domaine public. Les coordonnées originales restent disponibles pour une future
  carte ; le rendu de silhouette utilise une projection équirectangulaire locale,
  centrée, avec coupure dans le plus grand intervalle vide de longitude. Cela
  conserve îles/trous et rapproche les îles coupées par l’antéméridien.
- [flag-icons](https://github.com/lipis/flag-icons), commit
  `086f7e97d657358203916dbe84f61c2bccaa81eb`, licence MIT.

Les licences sont distribuées avec le corpus. La base dérivée est mise à
disposition sous ODbL-1.0 via le lien des crédits dans le jeu. Les transformations
sont décrites ici et exécutées par `tools/prepare-geography.ts` : filtrage du
périmètre, exonymes français, alias, capitales multiples, sélection des questions,
jointure des géométries par ISO3 et noms de fichiers de drapeaux par hash.
Aucune dépendance supplémentaire n’est nécessaire.

La carte fournit 166 géométries pour ce périmètre ; les pays absents de cette
échelle ne sont jamais tirés en silhouette. Les petites îles non représentées par
la source ne peuvent être inventées. Tous les polygones disponibles sont conservés,
y compris les territoires éloignés : certaines silhouettes sont donc dispersées.
Cette généralisation cartographique ne constitue pas une définition juridique
des frontières.

Les données sont une photographie des versions épinglées, pas un service de
veille géopolitique. Le changement de capitale ou de drapeau d’un pays nécessite
une revue des sources et de ses indicateurs d’éligibilité avant réactivation.

### Cas particuliers et ambiguïtés

Les capitales multiples sont conservées, notamment pour l’Afrique du Sud,
la Bolivie, l’Eswatini et le Sri Lanka. Pour l’Afrique du Sud, la question demande
explicitement **une** capitale et accepte Pretoria, Bloemfontein ou Le Cap ; les
choix Carré/Duo ne contiennent qu’une de ces bonnes réponses.

Les situations nécessitant une précision de statut (Bolivie, Eswatini, Sri Lanka,
Pays-Bas, Malaisie, Nauru, Israël, Palestine, Yémen, Indonésie, Guinée équatoriale,
Suisse, Bénin et Côte d’Ivoire) sont exclues des deux catégories de capitales.
Nauru n’est pas présenté comme possédant une capitale officielle. Les villes des
autres cas restent dans les données et le domaine de suggestions.

Les drapeaux de Roumanie/Tchad et Indonésie/Monaco sont exclus pour éviter les
quasi-identités ; Afghanistan et Syrie sont exclus dans cette première version
en raison des changements de drapeau et des variantes de représentation.

Une question de voisins montre tous les voisins du périmètre disponibles. Elle
n’est produite que si un seul pays possède **tous** ces voisins, y compris lorsque
plusieurs pays n’ont qu’un voisin. Les pays sans voisin sont exclus. Une capitale
partagée entre pays n’est pas utilisée comme indice.

## Recherche et distracteurs

`createCatalog` produit les domaines complets, pays et capitales. Une capitale
partagée n’a qu’une entrée et conserve la liste de ses pays. `normalizeSearch`
unifie casse, accents, ligatures, espaces, apostrophes, tirets et points ; aucune
distance floue n’est appliquée. Les textes affichés gardent leur orthographe.
Les alias explicites permettent notamment Pékin/Beijing, RDC/Congo-Kinshasa.
« Congo » seul est retiré des alias, car il serait ambigu.

La même comparaison sert à la validation Cash. Les suggestions filtrent tout le
domaine, sans limite arbitraire ; la liste est vide avant saisie et scrollable
ensuite. Flèches/Entrée, Échap et sélection tactile sont disponibles.

`optionsFor` exclut toutes les réponses acceptées avant de tirer les mauvaises
options. Il privilégie voisins, sous-région, région puis reste du monde, et mélange
la bonne réponse avec trois ou un distracteur. Pour les capitales, ce classement
s’applique aux pays auxquels elles appartiennent.

## Extension et présentation

`domain/generators.ts` contient le registre des générateurs (`eligible`, `build`).
Un générateur choisit son type de réponse, les bonnes réponses et les données
visuelles ; les domaines et distracteurs sont partagés par type de réponse.
Ajouter une catégorie nécessite son type, un générateur, ses clés i18n et, si
nécessaire, une variante de données/rendu. La distribution découvre le registre.

Les composants `question`, `cash-answer`, `answers` et `result` reçoivent des
inputs et émettent des outputs. Leurs pages showcase sont accessibles depuis
`/dev/components`. Le SCSS SMACSS du jeu est chargé par la route et les wrappers
showcase ; il utilise les tokens clair/sombre du portail. Tous les textes du jeu
passent par `I18nService` (préfixe `quiz.*`).

Les médias ne révèlent pas le nom dans leur libellé accessible. Les drapeaux ont
des chemins opaques, sans titre ni description SVG importée. La silhouette est
un path inline sans identifiant de pays. Il ne s’agit pas d’une protection contre
l’inspection des données locales : aucun mécanisme anti-triche n’est prévu.

## Préparation et vérification

```sh
npm run prepare:geography   # accès réseau uniquement lors de la préparation
npm test -- quiz           # moteur, corpus, géométries
npx ng test quiz --watch=false
npm run build:quiz         # UI et game-core, puis paquet quiz strict
npm run build              # portail, assets et manifeste de service worker
```

Le cache des sources est sous `tmp/geography-sources` (ignoré par Git). Pour
changer une version épinglée, renouveler également les fichiers correspondants
dans ce cache. Le build ordinaire utilise les fichiers déjà préparés et ne
télécharge rien. Le service worker précharge le petit corpus et tous ses drapeaux
dans le groupe `quiz-geography`, pour les parties hors connexion une fois
l’installation PWA achevée. Un chargement échoué affiche une action de nouvelle
tentative ; quitter la route annule la requête.
