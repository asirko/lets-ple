# Quiz géographie

Le troisième jeu du portail est chargé à la demande sous `/quiz`. Une partie
contient dix questions, réparties entre les types activés : silhouette,
drapeau, pays depuis sa capitale, capitale d’un pays et frontières terrestres.
Les dix pays sont distincts. Les catégories sont réparties par lots mélangés
(deux questions par type lorsque les cinq sont activés) ; deux catégories
consécutives diffèrent tant qu'au moins deux sont actives.

## Règles et état

Le joueur choisit Cash (5 points) ou Carré (3) à chaque question. Ce choix
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
L’état de la partie reste en mémoire, sans compte. Les préférences sont conservées
par `QuizSettingsService` sous `STORAGE_KEYS.quizSettings` (`quiz:settings`).
Seul le booléen `false` désactive un type ; une propriété absente ou invalide reste
active. Le menu de l'en-tête ouvre une modale de cinq cases à cocher. Annuler ou
Échap abandonne les modifications ; « Enregistrer et jouer » persiste et relance
dix questions. Au moins une catégorie doit être sélectionnée. Une sauvegarde
excluant tout affiche l'accès aux paramètres sans lancer de partie. Un échec
d'écriture affiche une erreur et conserve la partie et les préférences courantes.

## Données locales

`content/geography/countries.json` contient 195 États (193 membres de l’ONU,
Vatican et Palestine). Le périmètre est explicite, pas une liste exhaustive de
tous les territoires ISO. Chaque entrée porte ISO2, ISO3, nom français et alias,
`capitals[]`, alias des capitales, région/sous-région, frontières ISO3, fichier SVG
du drapeau et éventuellement géométrie GeoJSON Polygon/MultiPolygon.

Sources et versions sont enregistrées dans `manifest.json` :

- [mledoze/countries](https://github.com/mledoze/countries), commit
  `c8015eebdd94c533358406b0d709f441389e1f2e`, sous ODbL-1.0.
- [Natural Earth](https://www.naturalearthdata.com/), version 5.1.2, carte 1:10m,
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

La carte fournit 195 géométries pour ce périmètre. Le corpus complet représente
environ 11 Mo avant compression. Les petites îles non représentées par
la source ne peuvent être inventées. Tous les polygones disponibles sont conservés,
y compris les territoires éloignés : certaines silhouettes sont donc dispersées.
Cette généralisation cartographique ne constitue pas une définition juridique
des frontières.

### Revue des silhouettes

`/dev/components/quiz-silhouettes` affiche le corpus complet ;
`/dev/components/quiz-silhouettes-selection` présente la silhouette validée de la France :
métropole et Corse au centre, Guadeloupe/Martinique/Guyane à gauche, Mayotte/La Réunion
à droite. Ces cinq ensembles sont les seuls territoires ultramarins présents dans
la géométrie FRA du corpus ; les autres ne sont pas inventés. Cette composition
est intégrée au quiz ; l’ancien rendu est conservé dans la revue pour comparaison.
Le cadrage corrigé est validé pour BLZ, CIV, GIN, IRL, JAM, MEX, PAN, PER, DOM,
SLE, SUR, TTO et URY : le quiz et la revue complète utilisent cette version.
La coupure de longitude conserve la coordonnée exacte pour éviter qu'un arrondi
projette le point occidental à presque 360°. Les autres pays gardent leur rendu
actuel, avec aperçu corrigé et zones séparées disponibles dans la revue.

Le module `domain/silhouette-composition.ts` fournit les compositions en boîtes :
boîtes rapprochées pour MUS, TUV et TON ; cadrage principal avec encadrés latéraux
pour NOR, NZL, PLW, NLD, SYC et FRA. Elles conservent tous les polygones de la source,
chacun exactement une fois. Le nord reste en haut mais chaque boîte possède sa
propre échelle. Les positions des trois compositions compactes sont calées sur
le corpus épinglé ; les vues principales utilisent des fenêtres géographiques,
en gardant les petites îles voisines et les deux grandes îles néo-zélandaises.
Les zones lointaines sont regroupées par proximité (Svalbard regroupé explicitement).
MUS, NOR, PLW, NLD, TUV, TON, SYC, NZL et FRA sont validés et intégrés au quiz via
`approvedComposition`, avec le même composant SVG que la revue complète.
NZL utilise une fenêtre élargie (165° à 185° Est, 53° à 28° Sud) :
24 polygones dans la vue principale, deux polygones tropicaux lointains en encadrés
à droite du cadre principal aminci. SYC utilise le cadrage resserré avec les encadrés à droite et en bas.
MHL, KIR, MDV et FSM sont exclus uniquement du générateur de silhouettes via
`EXCLUDED_SILHOUETTE_COUNTRIES` : leurs contours sont trop dispersés pour ce jeu.
Leurs données, réponses et critères d'éligibilité dans les autres catégories sont
conservés. La revue complète les affiche avec une mention d'exclusion.

Les données sont une photographie des versions épinglées, pas un service de
veille géopolitique. Le changement de capitale ou de drapeau d’un pays nécessite
une revue des sources et de ses indicateurs d’éligibilité avant réactivation.

### Cas particuliers et ambiguïtés

Les capitales multiples sont conservées, notamment pour l’Afrique du Sud,
la Bolivie, l’Eswatini et le Sri Lanka. Pour l’Afrique du Sud, la question demande
explicitement **une** capitale et accepte Pretoria, Bloemfontein ou Le Cap ; les
choix Carré ne contiennent qu’une de ces bonnes réponses.

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
ensuite. Elle flotte au-dessus du champ et reste bornée au viewport visible,
y compris lorsque le clavier mobile ou le zoom réduit cet espace. Une nouvelle
recherche remet le premier résultat en vue ; les flèches ramènent l'option active
dans la liste sans déplacer la page. Flèches/Entrée, Échap et sélection tactile
sont disponibles ; un glissement tactile fait défiler sans sélectionner.

Pendant le focus de la saisie, le défilement de la page est verrouillé. Sur mobile,
le champ et le bouton sont fixés au bas du viewport visible, au-dessus du clavier.
Le focus peut passer au bouton par Tab sans déplacer ce bloc. Quitter le bloc ou
démonter le composant restaure les styles et la position de défilement de la page.
Une disposition compacte conserve des cibles tactiles de 44 pixels sur les
viewports très courts ; le bloc lui-même reste scrollable si un message dépasse
l'espace disponible.

« Valider ma réponse » occupe toute la largeur et reste grisé et désactivé tant
que la saisie ne correspond pas à une entrée du domaine attendu. Ce contrôle
utilise exactement la comparaison de validation Cash, alias compris : il vérifie
qu'il s'agit d'un pays ou d'une capitale reconnus, sans révéler si cette réponse
est correcte pour la question. La combobox conserve le focus lors d'un tap sur
une suggestion ; ses rôles et attributs ARIA, ainsi que les annonces d'erreur,
restent disponibles.

`optionsFor` exclut toutes les réponses acceptées avant de tirer les mauvaises
options. Il privilégie voisins, sous-région, région puis reste du monde, et mélange
la bonne réponse avec trois distracteurs. Pour les capitales, ce classement
s’applique aux pays auxquels elles appartiennent.
Pour une question de voisins, tous les pays cités comme indices sont exclus des
propositions. Les distracteurs privilégient les voisins de ces voisins, puis la
sous-région, la région et le reste du monde si nécessaire pour remplir le choix.

## Extension et présentation

`domain/generators.ts` contient le registre des générateurs (`eligible`, `build`).
Un générateur choisit son type de réponse, les bonnes réponses et les données
visuelles ; les domaines et distracteurs sont partagés par type de réponse.
Ajouter une catégorie nécessite son type, un générateur, ses clés i18n et, si
nécessaire, une variante de données/rendu. La distribution découvre le registre.

Les composants `toolbar`, `question`, `cash-answer`, `answers` et `result` reçoivent des
inputs et émettent des outputs. Leurs pages showcase sont accessibles depuis
`/dev/components`. Le SCSS SMACSS du jeu est chargé par la route et les wrappers
showcase ; il utilise les tokens clair/sombre du portail. Tous les textes du jeu
passent par `I18nService` (préfixe `quiz.*`).

Les médias ne révèlent pas le nom dans leur libellé accessible. Les drapeaux ont
des chemins opaques, sans titre ni description SVG importée. La silhouette est
un path inline sans identifiant de pays. Il ne s’agit pas d’une protection contre
l’inspection des données locales : aucun mécanisme anti-triche n’est prévu.

## Correction modale et globe

La correction utilise le dialogue partagé `LpDialog` en modal natif : le plateau
reste visible et inerte. Le focus initial arrive sur « Question suivante » ou
« Voir le résultat », reste dans la modale et revient à la question suivante ou
au titre du résultat. Échap est neutralisé : la correction est une étape du
parcours, dont le bouton est la seule sortie. La destruction d'un dialogue ouvert
ferme le dialogue natif et restaure son focus déclencheur.

`LpQuizCorrection` affiche le verdict, la réponse donnée, toutes les réponses
acceptées et les points. Le pays provient de `question.countryCode`, même pour une
question de capitale ou une réponse incorrecte. La fiche reprend le drapeau, les
capitales, les voisins et la région du corpus local. Les villes des pays exclus
des questions de capitales sont qualifiées comme villes de référence ; les
restrictions sur les drapeaux sont rappelées. Ces médias et leurs noms accessibles
ne sont montés qu'après soumission.

`LpCountryGlobe` charge Three.js et OrbitControls à la demande. Le pays est centré
sur le centroïde de son territoire principal, avec longitude déroulée pour les
pays traversant l'antéméridien. Une texture issue des mêmes géométries locales
met en évidence le pays. Glissement, molette et pincement permettent rotation et
zoom ; seul le bouton « Recentrer sur la solution » reste affiché, accompagné
d'un bouton « ? » qui affiche l'aide au survol, au focus ou au toucher. Le tooltip
se ferme avec Échap sans fermer la correction. La rotation est ralentie (40 % de
la vitesse par défaut à la distance initiale), proportionnelle à la hauteur de
la caméra au-dessus du globe pour rester douce en zoom rapproché. Les noms français apparaissent selon la vue et le zoom, avec priorité
au pays de la question et suppression des chevauchements. La liste « Pays dans la vue » et les boutons de
rotation/zoom sont retirés pour privilégier l'exploration directe du globe.

Le rendu n'a ni rotation automatique ni inertie animée ; il ne redessine que lors
d'une interaction, d'un redimensionnement ou d'un changement de thème. La texture
est limitée à 2048 × 1024, le pixel ratio à 1,5, politique partagée avec le globe des statistiques. À destruction, les ressources,
observateurs, écouteurs et le contexte GPU sont libérés ; un import tardif est
ignoré. L'accès à l'export du module dynamique reste via son namespace pour être
conservé par le build optimisé.

Une projection SVG fixe et la fiche textuelle remplacent WebGL si celui-ci est
indisponible, perdu, ou si le chunk ne peut pas être chargé. Sans géométrie,
l'absence de carte est explicitée. Le dialogue respecte reduced motion ; le globe
reste manipulable sans animation automatique. Les tokens clair/sombre sont
partagés avec le portail. Le corps défile et l'action reste visible à 320 pixels.

Les showcases `/dev/components/quiz-globe` et
`/dev/components/quiz-correction` permettent de vérifier France, Japon,
Nouvelle-Zélande, Afrique du Sud, Vatican et Fidji, ainsi que les rendus de secours.
Les styles visuels globaux sont regroupés dans `_quiz-correction.scss`, chargé
par la route et ces wrappers ; les écrans composent les composants.

## Préparation et vérification

```sh
npm run prepare:geography   # accès réseau uniquement lors de la préparation
npm test -- quiz           # moteur, corpus, géométries
npx ng test quiz --watch=false
npm run build:quiz         # UI et game-core, puis paquet quiz strict
npm run build              # portail, assets et manifeste de service worker
node projects/games/quiz/tools/verify-offline.mjs # Chromium, build requis
node projects/games/quiz/tools/verify-correction.mjs # modale, WebGL et clavier
```

Le cache des sources est sous `tmp/geography-sources` (ignoré par Git). Pour
changer une version épinglée, renouveler également les fichiers correspondants
dans ce cache. Le build ordinaire utilise les fichiers déjà préparés et ne
télécharge rien. Le service worker précharge le corpus et tous ses drapeaux
dans le groupe `quiz-geography`, pour les parties hors connexion une fois
l’installation PWA achevée. Un chargement échoué affiche une action de nouvelle
tentative ; quitter la route annule la requête.

La vérification Playwright utilise un profil vierge, attend l'installation de tous
les fichiers du manifeste, coupe le réseau et arrête le serveur puis recharge
`/quiz`. Elle exerce les cinq catégories, les deux modes de réponse, le résultat,
la persistance des réglages, l'annulation, le retour du focus et l'absence de
débordement à 320 pixels. Le premier téléchargement doit donc se faire en ligne.
Le serveur de développement n'active pas le service worker. Les liens externes
des crédits exigent le réseau ; les autres jeux utilisent leurs propres caches,
dont certains sont chargés à la demande.

La vérification de correction utilise le build optimisé et Chromium avec WebGL
logiciel. Elle vérifie centrage, zoom dans les deux sens, rotation par glissement,
recentrage et aide au clavier, inertie du plateau, focus, perte de contexte et libération GPU,
secours sans WebGL, thèmes, contrastes textuels et reduced motion. Elle parcourt
les dix questions et les cinq catégories jusqu'au résultat. Le repli à 200 % est
vérifié par son viewport CSS équivalent (640 × 500 pour un affichage 1280 × 1000),
en complément du viewport mobile de 320 pixels ; cela n'automatise pas le réglage
de zoom de l'interface Chrome. Les captures sont enregistrées sous
`tmp/quiz-correction-verification` (ignoré par Git).

## Historique et connaissances

Chaque transition valide de réponse vers correction capture un événement local versionné, y compris la dixième réponse et les parties interrompues. Une UUID renouvelée au démarrage identifie uniquement la partie locale ; la clé session:index rend les répétitions idempotentes. Le snapshot inclut date ISO UTC, identifiant/type de question, ISO3, continent, mode, réponse canonique, réponses acceptées, résultat, points obtenus/possibles et empreinte du corpus. Aucun compte ni identifiant personnel.

La route /quiz/statistiques, accessible depuis la barre du jeu et le résultat, expose le nombre de réponses, la réussite (correctes/n) et le score moyen (somme des points/n). Sans réponse, les deux moyennes valent null, affiché N.A. Les moyennes globales sont pondérées par les réponses. Focus continent et filtre de mode s'appliquent à toutes les vues. La couleur d'un pays reste « aucune donnée » à zéro, « données insuffisantes » avant cinq réponses, puis dépend du score moyen : faible sous 2, intermédiaire sous 3,5, élevé à partir de 3,5. Les barèmes Cash/Carré influencent le score : la légende le rappelle.

L'évolution montre quatre semaines calendaires locales, lundi 00h à lundi suivant, actuelle comprise. Le fuseau du navigateur est affiché ; les bornes sont converties en UTC pour comparer les événements. Les semaines vides affichent N.A., avec rupture des courbes et tableau équivalent.

Globe Three.js à la demande : rotation souris et zoom à la molette actifs par défaut sur ordinateur. Sur tactile, les gestes restent soumis à une activation explicite pour préserver le défilement de page. Aucun bouton de rotation/zoom/reset ; flèches et +/− restent disponibles sur le canvas au clavier. Les noms français sont projetés et placés sans chevauchement par le même utilitaire que la correction, avec priorité au pays sélectionné. Clic/tap ouvre les statistiques par type/mode dans la modale partagée (Échap, focus contenu, retour au déclencheur). Le tableau de tous les pays est retiré ; un sélecteur natif compact expose les pays du focus, petites îles comprises, au clavier et sans WebGL. Pas de rotation automatique ni d'inertie ; rendu uniquement sur changement et suspendu hors écran. Perte WebGL : libération immédiate et accès au détail conservé via le sélecteur. Changer vers un pays hors continent propose explicitement le nouveau focus.

Les assets knowledge sont préparés hors exécution depuis le corpus local : simplification 0,35 degré, six faces sphériques gnomoniques, trous conservés, triangulation/subdivision à 5 degrés, positions Int16 et indices Uint16. Les ancres sont intérieures aux maillages. 195 pays, 17 881 sommets, environ 222 Ko gzip ; aucun CDN. Commandes : npm run prepare:knowledge, verify:knowledge, measure:knowledge. Les tests de génération vérifient les 195 maillages, ancres, indices et arêtes.

Validation disponible : Chromium hors ligne, axe état vide/rempli, navigation continent/détail/effacement avec focus, perte WebGL, 320/360/390 px et enregistrement réel de dix réponses. À compléter avant clôture : appareils Android/iOS réels, Firefox/WebKit, lecteur d'écran, zoom navigateur 200 %, trace d'interaction 30 s et budgets mobiles. Les preuves desktop ne valident pas les téléphones.
