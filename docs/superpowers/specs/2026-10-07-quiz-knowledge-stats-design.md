# Geoquizz — historique local et statistiques de connaissances

Évolution d’interface validée le 2026-10-08 : la liste complète et le choix de vue liste sont remplacés par un sélecteur natif compact ; le détail pays devient une modale accessible. Les noms sont visibles sur le globe, avec placement partagé avec la correction. Les boutons de rotation/zoom/reset sont retirés ; molette active par défaut sur desktop, activation explicite des gestes sur tactile, flèches/+/- au clavier. Ces décisions remplacent les indications de liste, détail inline et boutons ci-dessous ; les critères matériels restant ouverts sont conservés.

Date : 2026-10-07. Statut : spec écrite approuvée le 2026-10-07. Plan rédigé séparément, approbation et méthode attendues. Aucune implémentation autorisée.
Branche : `codex/quiz-knowledge-stats`, worktree créé depuis le main local `dfe3fb6`.

## Intention et limites

Conserver chaque réponse validée localement pour aider le joueur à repérer ses forces, ses lacunes et leur évolution. Affichage global par défaut, focus facultatif sur un continent, résultats par type et pays, globe 3D interactif et liste accessible équivalente.
Aucun compte, identifiant personnel, télémétrie, collecte distante ou ressource réseau externe à l'exécution. L'historique appartient au navigateur et à l'origine de l'application ; sa suppression par le navigateur le supprime. Aucun export/import dans cette première version.

Ne pas modifier la correction, la saisie Cash, ni retirer Duo sur cette branche. Ne pas toucher à `content/quotes/`, déployer ou pousser. Avant toute implémentation, rebaser sur main contenant le retrait de Duo, relire les types et règles réellement disponibles, puis adapter les validateurs et barèmes. Les modes d'événements historiques ne dépendent pas du type Mode actif du moteur.

## Fondements observés

Références lues : AGENTS.md ; domain-quiz-geographie.md ; architecture.md ; i18n-storage.md ; conventions components.md, css.md et documentation.md.
Le réducteur pur `reduceGame` accepte une réponse uniquement en phase answering et passe en correction. Une saisie inconnue ou une soumission répétée conserve l'état. `QuizStore.dispatch` adapte ce réducteur aux signals. Les questionId sont de la forme type:ISO3 et se répètent entre parties. La partie n'est pas sauvegardée aujourd'hui.
`StorageService` est synchrone sur localStorage avec repli mémoire ; il reste destiné aux préférences et sauvegardes existantes. L'historique utilise un contrat asynchrone séparé.
Le corpus contient 195 États, cinq continents (Africa, Americas, Asia, Europe, Oceania), et des géométries Natural Earth épinglées. Mesure locale : 11 190 536 octets bruts, 3 988 381 octets gzip, 493 944 sommets. Le globe ne charge pas ce corpus complet.
Le routeur utilise loadChildren/loadComponent sans préchargement. Le service worker précharge les JS racine et `/content/geography/**`.
Le backlog GitHub a été consulté ; aucune issue existante ne correspond à cette fonctionnalité.

## Choix techniques

Retenu : IndexedDB avec `idb` et globe Three.js ciblé. idb réduit le code de plomberie tout en conservant les transactions et migrations IndexedDB. Three.js fournit une vraie scène 3D avec contrôle du rendu et des ressources.
Alternatives examinées : Dexie + Globe.GL (API plus riche et couches de pays disponibles, dépendances supplémentaires) ; IndexedDB natif + D3 orthographique (léger, sans WebGL, mais projection sphérique plutôt que scène 3D).
Dépendances verrouillées dans le lockfile lors de l'implémentation. Installation et préparation des assets uniquement en développement. Aucun CDN, texture distante, tuiles ou téléchargement de sources en production.
Sources : https://github.com/jakearchibald/idb ; https://threejs.org/docs/pages/OrbitControls.html ; https://globe.gl/ ; https://dexie.org/docs/Version/Version.upgrade() ; https://d3js.org/d3-geo/azimuthal ; https://angular.dev/guide/routing/customizing-route-behavior.

## Événement brut v1

```ts
interface QuizAnswerEventV1 {
  schemaVersion: 1;
  id: string; // sessionId + ':' + questionIndex
  occurredAt: string; // ISO 8601 UTC, horloge locale au moment de validation
  sessionId: string; // UUID aléatoire local à la partie
  questionIndex: number; // index base zéro
  questionId: string;
  questionType: string;
  countryIso3: string;
  continent: string;
  mode: string;
  answerType: 'country' | 'capital';
  submittedAnswer: { id: string; label: string };
  acceptedAnswers: readonly { id: string; label: string }[];
  correct: boolean;
  pointsAwarded: number;
  pointsPossible: number;
  corpusVersion: string;
}
```

Le résultat et les points sont des faits de la transition du moteur, pas des KPI agrégés. pointsPossible conserve le barème historique pour validation ; aucun indicateur de part des points possibles n'est affiché.
La réponse donnée est canonique et reconnue par le catalogue : ne pas conserver la saisie libre originale ni les saisies refusées. Les réponses acceptées figent les identifiants et libellés du catalogue au moment de la question ; les alias ne sont pas nécessaires à l'analyse.
countryIso3 désigne le pays interrogé, jamais le distracteur choisi ni chacun des voisins. continent reprend la classification du corpus à cet instant. Americas reste un seul continent, affiché comme Amériques.
corpusVersion est une version déterministe des données préparées, générée au build/préparation et jamais calculée en hashant les 11 Mo à chaque réponse.
Le validateur vérifie versions, identifiants, date, enums historiques connus, index entier, cohérence réponses/résultat et points numériques finis dans le barème versionné. Une nouvelle version de règles doit conserver l'interprétation des anciens événements.

## Collecte et idempotence

À chaque démarrage effectif d'une partie, créer un sessionId local. Dans QuizStore, comparer l'état précédent et le résultat du réducteur : enregistrer seulement une action answer ayant produit answering → correction. Ne rien enregistrer sur next, choix de mode, replay ou mise à jour de préférences.
Construire un snapshot immutable avant toute écriture asynchrone. Conserver les données de résolution depuis le catalogue sans réimplémenter la règle de réussite ; utiliser correct et awarded du nouvel état. Le moteur et les composants de réponse restent purs de tout effet de stockage.
Une réponse par index de partie : la clé primaire déterministe permet une réémission idempotente, sans écraser un événement divergent. Le snapshot de la dixième réponse est enregistré avant l'action next qui termine la partie.
Les réponses de parties interrompues comptent. Les showcases ne collectent rien. La correction reste immédiate et une écriture en attente est visible dans le statut de stockage ; une fermeture brutale avant commit peut perdre cette dernière réponse, sans prétendre garantir une persistance synchrone.

## KPI, filtres et couverture

Pour un ensemble E de réponses valides : N = nombre d'événements ; C = nombre d'événements corrects ; P = somme des points obtenus.
KPI affichés : nombre de réponses N ; taux de réussite C/N ; score moyen P/N. N=0 implique score et taux absents, libellé N.A., et jamais zéro artificiel.
Ne pas afficher de cartes bonnes/mauvaises ni de part des points possibles. Le calcul de C reste interne au taux de réussite.
Les agrégations globales sont pondérées par les réponses, jamais par une moyenne des moyennes de pays ou de sessions. Score moyen exprimé en points par réponse, sur le barème réel (actuellement 0 à 5) ; les changements de barème futurs nécessitent une évolution explicite de cette spec.
Affichage cumulatif tout historique par défaut. Le focus continent filtre les KPI, la tendance, les répartitions et la liste de pays ensemble. Les pays hors focus sont atténués et leur sélection propose explicitement de changer le focus. Un filtre facultatif de mode s'applique à tout cet ensemble. Les détails pays reprennent les mêmes filtres, avec résultats par type et mode.
Présenter l'effectif et les types pratiqués pour ne pas assimiler une réussite sur un seul type à la connaissance de tous les aspects du pays. Aucun classement normatif des joueurs.

## Couleur des pays : score moyen et seuil minimal

À la demande du joueur, utiliser simplement le score moyen P/N : aucune réussite bayésienne, réponse fictive ou correction du hasard. La protection contre un échantillon minuscule est le seuil minimal maintenu de cinq réponses dans le périmètre filtré.
N=0 : aucune donnée, gris neutre. 1≤N<5 : données insuffisantes, motif distinct sans classe de niveau. N≥5 : faible si moyenne <2 ; intermédiaire si 2≤moyenne<3,5 ; élevé si moyenne ≥3,5.
Une seule réponse ne colore donc jamais un pays comme connu ou inconnu. Les seuils correspondent à 40 % et 70 % de l'échelle absolue 0–5, sans afficher un KPI de points possibles.
La légende parle de score moyen observé et explique l'effet des modes : une bonne réponse Carré rapporte moins qu'une bonne réponse Cash. Ces catégories ne sont pas une estimation indépendante du mode ni une preuve de maîtrise. Le taux de réussite reste visible pour apporter le contexte.

## Évolution sur quatre semaines

Quatre semaines calendaires : semaine actuelle, explicitement indiquée en cours, et trois semaines précédentes ; lundi 00:00 inclus à lundi suivant exclu dans le fuseau local du navigateur à l'affichage.
Le calcul pur reçoit des bornes UTC explicites construites par un adaptateur calendrier ; aucune dépendance à Date.now ou au fuseau implicite dans l'agrégateur. Le fuseau utilisé est indiqué dans la vue. Un changement de fuseau peut modifier les regroupements, jamais les dates brutes.
Pour chaque semaine : N, taux C/N, score moyen P/N. Le focus continent et le filtre de mode sont appliqués avant regroupement. Les réponses de parties incomplètes comptent selon leur date, pas selon la fin de partie.
Une semaine vide affiche N=0 et N.A. pour score/taux ; graphiques avec rupture, sans interpolation ni zéro artificiel. Les semaines partielles ont leur effectif affiché, sans seuil de masquage du score moyen : le seuil de cinq concerne seulement la coloration des pays.
Vue compacte avec deux courbes distinctes, score et réussite, pour éviter un double axe ambigu, et tableau textuel des quatre semaines toujours disponible. Pas de calcul de progression comparant arbitrairement une semaine vide à une autre. Les KPI cumulatifs ne sont pas limités silencieusement à ces quatre semaines.

## Architecture et composants

1. `history/` dans le quiz : port QuizHistoryRepository, adaptateur IndexedDB idb, adaptateur mémoire, migrations et statut. Méthodes append, lecture par lots sur snapshot cohérent, clear ; statut durable/en attente/temporaire/erreur.
2. `domain/knowledge-stats/` : types d'événements, validation, agrégations pures, séries hebdomadaires à bornes explicites, classification du score. Aucun import Angular, WebGL ou IndexedDB.
3. `store/` : façade stats signals qui orchestre lecture, filtres, sélection, effacement et refresh. KPI dérivés en mémoire seulement, jamais persistés. Invalidation après écriture/effacement et notification locale inter-onglets sans contenu personnel ; focus de page relit pour rattraper une notification manquée.
4. `ui/` : page logique routée QuizStatisticsPage et composants UI autonomes Summary, ContinentFocus, WeeklyTrend, TypeBreakdown, CountryList, CountryDetail, KnowledgeLegend, EmptyHistory, HistoryStatus et ClearHistoryDialog.
5. `globe/` : adaptateur Three.js isolé et composant UI recevant classes par ISO3 et sélection ; outputs sélection pays et indisponibilité. Pas de lecture d'historique dans le globe.
6. QuizStore : seul point de capture décrit plus haut ; aucun changement au moteur, à Cash ou à la correction.

Showcases avant ou en même temps que les composants, avec données fixes et états vide, faible effectif, erreur, tableau rempli et libellés longs. Styles globaux dans le module quiz SMACSS ; page logique limitée à la disposition. i18n `quiz.stats.*`, noms de pays issus du corpus.

## Routage et préchargement passif

Ajouter `/quiz/statistiques` avec loadComponent, route spécifique avant la route vide et correspondance vide exacte. Accès depuis toolbar et résultat, titres et focus de navigation appropriés. Retour au quiz démarre selon le comportement de route existant ; ne pas introduire une sauvegarde de partie implicite.
Configurer withPreloading avec une stratégie sélective par métadonnées de route. Les pages produit et les routes imbriquées sont préchargées après navigation, pendant une période d'inactivité, séquentiellement. requestIdleCallback avec repli timer borné ; ne pas lancer pendant une interaction ou navigation active. Respecter saveData et connexion lente lorsqu'exposés, sans rendre leur présence obligatoire. Ne pas précharger `/dev/components` ni ses enfants.
Cette stratégie est préférée à PreloadAllModules pour éviter l'évaluation de tous les showcases et une concurrence inutile sur mobile. Le préchargement importe le code des pages sans les instancier ni ouvrir IndexedDB ou charger des corpus.
Three.js et son adaptateur lourd sont dans un import dynamique supplémentaire déclenché par la vue globe affichée ; ne pas les réexporter par un barrel qui les rendrait eager. La liste est disponible avant le globe. Une préférence de vue liste évite ce chargement pour cette visite.
Le service worker et le routeur ont des responsabilités différentes : les JS et assets sont préchargés dans le cache pour le hors-ligne après installation ; le routeur importe/évalue les pages en arrière-plan. La stratégie ne doit pas empêcher ou retarder indéfiniment l'installation du service worker registerWhenStable:30000. Mesurer les deux mécanismes ensemble.

## IndexedDB, migrations et erreurs

Base dédiée, nom centralisé avec les identifiants de stockage dans game-core ; version de base indépendante de schemaVersion des événements et du préfixe localStorage existant. v1 crée answers avec keyPath id et index date, sessionId, countryIso3 et insertionSequence unique ; metadata contient historyGeneration et nextInsertionSequence. Une enveloppe de persistance ajoute génération et séquence à chaque événement brut. Aucun store de KPI.
Initialiser le repository et lire historyGeneration avant collecte durable. À la validation, attacher cette génération au snapshot et la conserver pendant tous les retries. Sans génération connue, garder les réponses temporaires en mémoire et annoncer la persistance indisponible ; ne pas les transférer automatiquement vers une base existante après récupération. append valide puis, dans une transaction answers + metadata, vérifie la génération, attribue et incrémente insertionSequence et ajoute la ligne ; attendre tx.done pour annoncer une sauvegarde durable. Une génération ancienne est refusée et son snapshot retiré comme appartenant à un historique effacé, jamais réattribué. Réémission identique déjà présente = succès ; même id avec contenu différent = anomalie, ne pas écraser.
Migrations atomiques en transaction upgrade, séquentielles, déterministes et sans réseau. Échec de migration annule la transaction. Une version de base plus récente que le code ou un événement de version inconnue n'est jamais rétrogradé ou supprimé automatiquement.
Sur versionchange, fermer la connexion et proposer la réouverture ; sur blocked, signaler les onglets bloquants et permettre une nouvelle tentative. Pas d'attente infinie dans le flux de réponse.
Quota, indisponibilité et terminaison de connexion : continuer le jeu, avertissement non modal, file mémoire de snapshots avec leurs identifiants stables et nouvelle tentative explicite. Les statistiques distinguent données durables et données temporaires, fusionnées par id pour éviter les doublons. Si la base ne peut être lue, ne pas présenter les seules données mémoire comme tout l'historique.
File temporaire limitée à 1000 événements : au-delà, signaler que les nouvelles réponses ne peuvent être conservées ; ne pas purger le durable ni perdre silencieusement les anciens événements. Réessayer les écritures séquentiellement et retirer de la file seulement après commit.
Validation à la lecture : événements invalides/inconnus exclus du calcul, nombre signalé, données conservées. Une base illisible n'est pas effacée automatiquement ; réessayer ou réinitialiser avec confirmation explicite.
Effacement confirmé : suspendre la capture locale, sérialiser les mutations et attendre les écritures en cours. Dans une même transaction answers + metadata, incrémenter historyGeneration et vider answers sans remettre insertionSequence à zéro. Le commit est la coupure effective ; puis purger mémoire, synchroniser la génération locale et invalider caches/notifications avant reprise de capture. Un échec ne doit pas afficher de succès ou vider la mémoire comme si le durable était supprimé. Notifier les autres onglets ; relire metadata avant reprise des écritures. Les anciens snapshots gardent leur génération et sont refusés. Une réponse concurrente capturée avec génération périmée peut être perdue, avec signalement explicite. La conservation des nouvelles réponses reprend après effacement terminé et synchronisation locale. Les snapshots de génération inconnue restent temporaires ; clear et sa notification les purgent aussi.
Aucun effacement automatique pour gagner du quota. État vide pédagogique : réponses enregistrées à partir de l'installation de cette fonctionnalité, confidentialité locale, seuil minimal, accès au jeu et limites de durabilité.

## Globe, géométries et accessibilité

Asset de géométries simplifiées distinct du corpus du quiz, généré depuis les sources épinglées. Métadonnées légères séparées pour noms/continents/versions ; aucune lecture des 11 Mo sur la route stats. Respecter licences, provenance et notes de généralisation cartographique. Ne pas modifier les silhouettes existantes.
Préparation hors runtime des surfaces triangulées par ISO3 avec traitement des trous et de l'antéméridien ; contrôler frontières, winding, couverture, surfaces et absence de triangles traversant la sphère. Conserver tous les pays dans la liste ; petites îles invisibles à cette échelle accessibles par recherche et sélection, sans inventer un territoire. Des marqueurs de sélection peuvent représenter un point de repérage, clairement distinct d'une surface réelle.
Rotation drag souris/tactile, zoom pincement, boutons +/− et reset. Limiter le zoom et préserver le défilement de page ; aucune capture globale de molette. Distinguer drag et tap avant sélection. Clic/tap ou sélection de liste ouvre le même détail pays.
Globe sans rotation automatique. reduced motion supprime inertie et transitions de recentrage. Rendu uniquement à la demande, arrêt hors viewport/onglet masqué ; résolution plafonnée à DPR 1,5 ; resize observé ; dispose géométries/matériaux/contrôles/renderer à la destruction.
Liste/tableau accessible toujours disponible : recherche, tri, focus continent, activation clavier, même détail et même légende. Pas de centaines de zones tabulables sur canvas. Contrôles de rotation/zoom clavier avec instructions ; focus visible et absence de piège. Échec/perte WebGL conserve la liste et annonce le repli.
Catégories distinguées par texte et motifs en plus de la couleur. Contraste WCAG AA et focus ; cibles tactiles au moins 44 px. Détails inline pour éviter une nouvelle modale ; annonce sobre de sélection et gestion du focus.
Confirmation d'effacement : réutiliser primitives UI de dialogue, annulation par défaut, Escape, focus piégé pendant le dialogue et restauré au déclencheur. Tous les graphiques ont un tableau textuel équivalent.
Vérifier 320, 360 et 390 px, portrait/paysage, texte long, zoom navigateur 200 %, reduced motion et thèmes clair/sombre. Pas de débordement de page ; listes transformables en cartes sémantiques si nécessaire.

## Budgets et protocole de mesure

Mesures déjà disponibles uniquement pour le corpus existant. Les valeurs suivantes sont des critères d'acceptation à mesurer en implémentation, pas des résultats annoncés.

| Mesure incrémentale | Limite |
| --- | --- |
| JS du flux de réponse | 10 Ko gzip |
| JS route stats + globe, hors socle partagé déjà présent | 250 Ko gzip |
| Géométries/métadonnées dédiées | 500 Ko gzip, 50 000 sommets maximum |
| Heap JS de la vue stats | +50 Mo face à la page produit sans stats |
| Ressources GPU estimées | 32 Mo |
| Interaction sur mobile réel | au moins 30 fps, frame p95 ≤33 ms |
| Lecture et calcul de 100 000 événements | ≤1 s sur mobile de référence |

Avant de fixer les résultats, consigner modèle du téléphone Android de milieu de gamme, OS, navigateur, dimensions et DPR ; utiliser également Safari iOS réel pour compatibilité et persistance. Émulation desktop/CPU throttling utile mais insuffisante pour valider le budget mobile. Si aucun appareil réel n'est disponible, marquer le critère non vérifié et le soumettre à revue, sans prétendre l'avoir validé.
Build production comparé à la base rebasée : tailles brutes/gzip de tous les chunks, graphe de dépendances, chargements avant/après navigation et préchargement passif. Mesurer ouverture à froid puis en cache, lecture/KPI sur 0, 1000, 10 000 et 100 000 événements, traces de rotation/zoom/sélection pendant 30 s et heap après cinq entrées/sorties. Ressources GPU estimées à partir des buffers et render targets ; préciser que ce n'est pas la mémoire driver réelle.
Lecture par lots avec agrégation incrémentale pure, sans getAll de 100 000 snapshots. Capturer dans une transaction readonly metadata la génération G et H = nextInsertionSequence − 1. Lire insertionSequence en ordre croissant, borne haute H incluse et reprise exclusive après le dernier numéro, en vérifiant G dans la transaction de chaque lot. Les nouvelles insertions, même datées du passé, ont une séquence >H et attendent le refresh suivant. Les événements existants sont immuables hors migration/effacement. Le calcul CPU intervient entre transactions courtes. Vérifier G avant publication ; si elle change, abandonner et relancer sans publier de mélange avant/après effacement. Une migration/versionchange annule la lecture. Un worker ne sera ajouté que si les mesures montrent des tâches longues >50 ms malgré le traitement borné ; il exige une décision de conception actualisée.
Si un budget échoue, optimiser simplification, triangulation, imports et scheduling ; ne pas augmenter silencieusement le budget ni remplacer la 3D sans validation.

## Vérifications et critères d'acceptation

- Vitest Node : validateurs et KPI purs, N=0, pondération par réponse, filtres combinés, points historiques, seuils exacts 5/2/3,5, une seule réponse, semaines vides et partielles, dates aux bornes, passage d'année et changement d'heure.
- Persistance : IndexedDB simulé pour transactions et migrations ; vrais Chromium/Firefox/WebKit pour reload, blocked/versionchange, migrations anciennes, multi-onglets, quota simulé, corruption, version inconnue, retry/idempotence et effacement concurrent.
- Intégration QuizStore : une capture par transition, zéro sur saisie refusée ou double clic, dixième réponse, replay, sortie de route et échec asynchrone ; showcase sans collecte.
- Angular : présentation, filtres, état vide/erreur/temporaire, détails, confirmation et restauration du focus ; runner ng test pour composants.
- Navigation : accès direct /quiz/statistiques, retour, deep link, import lazy, préchargement après navigation, exclusion showcase, économie de données, aucun chargement lourd depuis le flux de réponse.
- Accessibilité : axe sur états de showcase et page, puis revue manuelle clavier et lecteur d'écran, tactiles, zoom 200 %, small screens, reduced motion ; les tests automatisés ne suffisent pas seuls.
- Offline production : profil vierge, attendre installation complète, couper réseau et arrêter serveur, recharger la route stats sans visite préalable, globe/liste opérationnels, historique persistant et effacement fonctionnel. Aucune requête externe.
- Mesures de performance consignées face aux budgets ci-dessus ; licences et couverture ISO3 vérifiées.

## Suite et portes de validation

Cette spec fera l'objet d'une revue indépendante puis d'une approbation écrite du joueur. Ce document n'autorise pas l'implémentation. Après approbation de la spec, préparer le plan détaillé et demander son approbation ; avant exécution, rebase obligatoire sur main incluant le retrait de Duo et réconciliation des contrats.
Créer l'issue dédiée et la placer En cours pour la conception, en précisant les approbations encore attendues. Ne pas publier de lien de jeu ni pousser cette branche.
À la fin de l'implémentation future, intégrer les faits durables dans domain-quiz-geographie.md, architecture.md et i18n-storage.md, puis retirer spec/plan conformément à documentation.md.

## Résultat de relecture indépendante

Relecture du 2026-10-07 : préciser snapshot par séquence monotone, génération liée au snapshot et store metadata dès v1. Ces corrections sont intégrées. Respect des ajustements KPI, semaines, routage et budgets confirmé. Approbation humaine de la spec reçue le 2026-10-07 ; approbation du plan encore attendue.

## Exécution autorisée (2026-10-08)

Spec et plan approuvés dans la conversation. L'instruction suivante du joueur a remplacé le prérequis main par develop : rebase effectué sur 5bcb07b, qui contient le retrait de Duo (90ef992). Modes réellement disponibles : Cash 5 points, Carré 3. Implémentation en place ; validations matérielles encore ouvertes.
