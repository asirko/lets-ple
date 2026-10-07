> Ajustement approuvé le 8 octobre 2026 : contours simplifiés à 0,08 degré, budget des assets porté à 600 Ko gzip ; limite de 50 000 sommets conservée.

# Geoquizz — Knowledge Statistics Implementation Plan

Évolution d’interface validée le 2026-10-08 : la liste complète et le choix de vue liste sont remplacés par un sélecteur natif compact ; le détail pays devient une modale accessible. Les noms sont visibles sur le globe, avec placement partagé avec la correction. Les boutons de rotation/zoom/reset sont retirés ; molette active par défaut sur desktop, activation explicite des gestes sur tactile, flèches/+/- au clavier. Ces décisions remplacent les indications de liste, détail inline et boutons ci-dessous ; les critères matériels restant ouverts sont conservés.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enregistrer localement les réponses et afficher les connaissances globales ou par continent, leur évolution et un globe accessible.
**Architecture:** Événements bruts dans IndexedDB/idb ; calcul TypeScript pur incrémental ; façade signals et UI autonome dans le showcase. Three.js importé séparément, capture minimale dans QuizStore et préchargement passif sélectif.
**Tech Stack:** Angular 22, IndexedDB/idb, Three.js/OrbitControls, Vitest, Angular unit-test, Playwright.
**Spec:** [Spec approuvée le 2026-10-07](../specs/2026-10-07-quiz-knowledge-stats-design.md).
**Statut:** approuvé, implémentation et revue effectuées sur `codex/quiz-knowledge-stats` après rebase develop 5bcb07b ; issue #16 En cours pour validations matérielles.

## Global Constraints

- Node ≥24.15.0 ; toujours nommer le projet ng.
- Avant tout code, dépendance ou génération : rebase sur main contenant le retrait de Duo, puis adaptation aux modes réels. Si retrait absent de main, arrêter avant implémentation.
- Ne pas modifier correction/Cash ni retirer Duo ; ne pas toucher `content/quotes/`, pousser ou déployer.
- Aucun compte, identifiant personnel, télémétrie, CDN ou ressource externe au runtime ; fonctionnement hors ligne après installation complète.
- Aucun KPI persistant ; N, taux de réussite et score moyen seulement, global pondéré par réponse ; focus continent/mode cohérent partout.
- Quatre semaines locales calendaires dont celle en cours, N.A. sans données ; moyenne réelle et seuil de cinq réponses pour coloration.
- UI/showcase avant assemblage, CSS SMACSS, i18n `quiz.stats.*` ; moteur pur.
- Budget JS flux réponse 10 Ko gzip ; route stats + globe 250 Ko gzip ; assets 600 Ko gzip et 50 000 sommets ; heap +50 Mo ; GPU estimé 32 Mo ; ≥30 fps, frame p95 ≤33 ms ; lecture/KPI 100 000 réponses ≤1 s sur mobile réel.
- Worker supplémentaire, changement de barème/budget ou abandon 3D exigent une conception actualisée et validée.

## Review Focus

1. Effacement dans un autre onglet : anciennes réponses refusées, jamais réattribuées à une génération récente (3/4/11).
2. Insertion tardive datée du passé : séquence de lecture stable puis refresh, sans omissions/doublons (3/6).
3. Changement d’heure, fuseau ou année : semaines locales contiguës, pas de N.A. converti en zéro (2/7).
4. Îles, trous, antéméridien : maillage sans triangles traversant le globe, liste complète indépendamment de la surface (5/8).
5. WebGL perdu, migration bloquée, navigation pendant preload : liste préservée, travail périmé annulé et ressources libérées (3/8/9/11).

## Carte des fichiers

Chemins relatifs au worktree dédié, sauf indication. Sous `projects/games/quiz/src/lib/` :

- `domain/knowledge-stats/` : events.ts, validate-event.ts, statistics.ts, knowledge-level.ts, weekly-statistics.ts et specs colocalisées ; fixture commune dans fixtures.spec.ts. Pur, runner Vitest Node.
- `history/` : history-port.ts, history-schema.ts, history-migrations.ts, indexeddb-history.ts, history-coordinator.ts, history-calendar.ts et specs ; adaptateurs hors domaine, runner ng test quiz.
- `data/knowledge-data.ts` et spec : métadonnées légères/version/maillage, fetch local annulable.
- `store/quiz-history.service.ts`, quiz-statistics.store.ts et specs ; create-answer-event.ts ; modification quiz.store.ts avec nouvelle spec.
- `ui/` : statistics-summary, continent-focus, weekly-trend, type-breakdown, country-list, country-detail, knowledge-legend, empty-history, history-status, clear-history-dialog, knowledge-globe. Chaque dossier porte composant `.ts`, `.showcase.ts`, tests comportementaux.
- `ui/statistics-route/quiz-statistics-page.ts` et spec : page logique.
- `globe/globe-port.ts`, three-globe.ts, globe-interactions.ts et tests : scène et interactions séparées, aucune importation runtime par public-api.

Outils sous `projects/games/quiz/tools/` : knowledge-map.ts/spec, prepare-knowledge-map.ts, verify-knowledge.mjs, measure-knowledge.mjs, knowledge-browser-helpers.mjs.
Assets : `content/geography/knowledge/{countries.json,map.json,manifest.json}` ; ne pas modifier les silhouettes/countries.json existants.
Portail : app/routing/idle-preloading.ts/spec, app.config.ts, app.routes.ts, dev/dev.routes.ts et dev/dev-home/dev-home-page.ts pour showcase.
Partagés : game-core storage-keys.ts/public-api.ts/fr.json ; styles quiz `_quiz.scss`. Config : package.json/lockfile, quiz/ng-package.json, ngsw-config.json si nécessaire. Aucun CI/Firebase.
Ordre séquentiel 0→12 ; chaque tâche finit par tests et commit local ciblé.

## Tâche 0 — rebase et baseline, condition préalable

**Files:** aucun produit ; ajuster spec/plan seulement si main change les contrats.
**Produces:** SHA main de référence, modes/barèmes disponibles et baseline reproductible.

- [ ] Vérifier branche propre et main :

```powershell
git status --short
git branch --show-current
git log -10 --oneline main
git show main:projects/games/quiz/src/lib/domain/types.ts
git show main:projects/games/quiz/src/lib/domain/game.ts
```

- [ ] Confirmer retrait Duo dans main, relire moteur/QuizStore/docs. S’il manque, signaler dépendance et arrêter ; aucune fusion de branche de retrait sans instruction.
- [ ] Rebase seulement après approbation de ce plan et main prêt :

```powershell
git rebase main
node --version
npm ci
npm test
npx ng test quiz --watch=false
npm run build:quiz
npm run build -- --stats-json
```

- [ ] Archiver SHA/sorties/stats baseline sous tmp/knowledge-stats/baseline (ignoré). Vérifier échelle 0–5 ; si modifiée, faire valider nouveaux seuils avant implémentation. Adapter les enums historiques sans importer Mode actif dans les événements.

## Tâche 1 — événement et validation pure

**Files:** create events.ts, validate-event.ts/spec, fixtures.spec.ts dans domain/knowledge-stats.
**Consumes:** schéma approuvé, modes et barème après tâche 0.
**Produces:** QuizAnswerEventV1 de la spec ; `AnswerSnapshot = {event:QuizAnswerEventV1; generation:number|null}` ; `parseAnswerEvent(value:unknown):QuizAnswerEventV1|null` ; `answerFixture(overrides?:Partial<QuizAnswerEventV1>)` avec Cash correct/FRA/flag:FRA/5 points et UUID constant.

- [ ] Écrire tests rouges, dont :

```ts
expect(parseAnswerEvent(null)).toBeNull();
expect(parseAnswerEvent(answerFixture({correct:false,pointsAwarded:5}))).toBeNull();
expect(parseAnswerEvent(answerFixture({occurredAt:'invalid'}))).toBeNull();
expect(parseAnswerEvent(answerFixture({pointsAwarded:Infinity}))).toBeNull();
expect(parseAnswerEvent(answerFixture())).not.toBeNull();
```

- [ ] Run `npm test -- validate-event`, vérifier échec pertinent ; implémenter guards structurels, versions/enums historiques, ISO3/index/id/date UTC, nombres finis, réponse canonique et listes acceptées non vides/uniques. Pas de throw sur unknown.

```ts
if (e.correct !== e.acceptedAnswers.some(a=>a.id===e.submittedAnswer.id)) return null;
if (e.pointsAwarded !== (e.correct ? e.pointsPossible : 0)) return null;
```

- [ ] Tester capitales multiples, version future, incohérence id/session/index et barème ; aucun statut actuel du corpus ne réécrit l’histoire. Run test vert ; commit `feat(quiz): definit les evenements de reponse historiques`.

## Tâche 2 — calculs et calendrier

**Files:** create statistics.ts/spec, knowledge-level.ts/spec, weekly-statistics.ts/spec ; history/history-calendar.ts/spec.
**Produces:**

```ts
type StatsFilters={continent:string|null;mode:string|null};
type Metrics={count:number;successRate:number|null;averageScore:number|null};
type WeekWindow={startMs:number;endMs:number;current:boolean};
type KnowledgeLevel='none'|'insufficient'|'low'|'medium'|'high';
// StatsResult: overall Metrics, byCountry/byContinent/byType/byMode Maps,
// weeks [{window,metrics}], countryTypes Map<string,Set<string>>.
createAccumulator(filters:StatsFilters,windows:readonly WeekWindow[]):StatsAccumulator;
addAnswers(acc:StatsAccumulator,events:readonly QuizAnswerEventV1[]):void;
finishStatistics(acc:StatsAccumulator):StatsResult;
classifyKnowledge(metrics:Metrics):KnowledgeLevel;
localWeekWindows(now:Date):{windows:readonly WeekWindow[];timeZone:string};
```

- [ ] Tests rouges :

```ts
expect(classifyKnowledge({count:1,successRate:1,averageScore:5})).toBe('insufficient');
expect(classifyKnowledge({count:5,successRate:1,averageScore:3.5})).toBe('high');
// Deux réponses 5 et 0 => count 2, successRate .5, averageScore 2.5.
// Zéro réponse => count 0, successRate null, averageScore null.
```

- [ ] Run `npm test -- statistics knowledge-level`, puis accumulateur mémoire par réponse, filtrage avant agrégation, pas de moyenne de moyennes. Seuils N<5 ; moyenne <2 faible ; <3,5 intermédiaire ; sinon élevée.
- [ ] Construire cinq lundis locaux via Date locale et setDate, jamais soustraction fixe de 168 heures ; convertir en bornes UTC et injecter fenêtres dans domaine.

```ts
const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
// Offsets calendaires -21,-14,-7,0,+7 jours : quatre fenêtres.
```

- [ ] Tester lundi inclus/fin exclue, quatre fenêtres contiguës, changement d’année et DST Europe/Paris (167/169h), semaine vide null, focus combiné continent/mode et pondération inégale. Run Vitest + ng test quiz pour calendrier ; commit `feat(quiz): calcule les connaissances et leur evolution`.

## Tâche 3 — IndexedDB et migrations

**Files:** create history-port/schema/migrations/indexeddb-history et specs ; modifier game-core identifiants centralisés ; package.json/lockfile et quiz ng-package.json pour idb.
**Produces:**

```ts
type AppendResult='stored'|'duplicate'|'stale';
type ReadSnapshot={generation:number;highSequence:number};
type HistoryBatch={events:readonly QuizAnswerEventV1[];lastSequence:number|null;invalidCount:number};
interface QuizHistoryRepository {
 open():Promise<number>; append(s:AnswerSnapshot):Promise<AppendResult>;
 beginRead():Promise<ReadSnapshot>;
 readBatch(s:ReadSnapshot,after:number,limit:number):Promise<HistoryBatch>;
 verifyRead(s:ReadSnapshot):Promise<void>; clear():Promise<number>; close():void;
}
```

- [ ] Installer idb runtime et fake-indexeddb dev seulement à cette étape ; verrouiller versions et déclarer idb dans allowedNonPeerDependencies du quiz. Factory IDB isolée par test.
- [ ] Test rouge transactionnel :

```ts
const generation=await repo.open();
const s={event:answerFixture(),generation};
expect(await repo.append(s)).toBe('stored');
expect(await repo.append(s)).toBe('duplicate');
const read=await repo.beginRead();
await repo.clear();
expect(await repo.append(s)).toBe('stale');
await expect(repo.readBatch(read,0,1000)).rejects.toMatchObject({code:'changed'});
```

- [ ] Run ng test quiz rouge. Créer DB v1 : answers enveloppes `{id,event,generation,insertionSequence}`, keyPath id ; indexes insertionSequence unique, event.occurredAt/sessionId/countryIso3. metadata contient historyGeneration et nextInsertionSequence.
- [ ] append en transaction answers+metadata vérifie G, duplicate identique/conflict divergent, attribue séquence et attend tx.done. clear incrémente G et vide answers dans même transaction sans remettre compteur à zéro.
- [ ] Lecture capture G/H ; readBatch vérifie G en transaction, avance par séquence >after ≤H même sur lignes invalides ; verifyRead avant publication. Typed errors unavailable/quota/blocked/version/conflict/changed/corrupt. Fermeture sur versionchange, blocked visible, aucune purge automatique.
- [ ] Tests migration 0→1, ancienne fixture, helper upgrade rollback synthétique sans v2 fictive produit ; future version conservée ; deux connexions blocked/versionchange ; insert tardif >H ; batch tout invalide ; quota/terminaison simulés ; corruption non destructive. Run ng test quiz vert ; commit `feat(quiz): persiste lhistorique dans indexeddb`.

## Tâche 4 — coordination, repli et génération multi-onglets

**Files:** create history-coordinator.ts/spec et store/quiz-history.service.ts/spec.
**Consumes:** repository tâche 3. **Produces:** service root queue/statut ; `capture(e):void`, `retry():Promise<void>`, `clear():Promise<void>`, `refreshGeneration():Promise<void>`, `temporaryEvents():readonly QuizAnswerEventV1[]` ; état durable/pending/temporary/incomplete/error.

- [ ] Test rouge :

```ts
repo.append.mockRejectedValue(Object.assign(new Error(),{code:'quota'}));
coordinator.capture(answerFixture());
await coordinator.retry();
expect(coordinator.temporaryEvents()).toHaveLength(1);
expect(coordinator.status().kind).toBe('temporary');
```

- [ ] Implémenter queue séquentielle limitée 1000 avec génération figée à capture, jamais changée au retry ; snapshots unknown temporaires non transférés automatiquement. 1001e réponse refusée avec statut explicite, aucun durable purgé.
- [ ] Notification locale BroadcastChannel sans événement brut, fallback storage-event via clé centralisée et focus refresh. Notification = hint, relire metadata ; append protège même si notification manque. Service root garde queue quand route détruite.
- [ ] Tests A snapshot ancien, B clear G+1, A retry stale sans réinsertion ; clear en échec garde mémoire/durable ; clear réussi purge queue antérieure ; capture synchronisée G+1 stockée ; unknown purge sur clear ; absence de loop et listeners nettoyés. Run ng test quiz ; commit `feat(quiz): gere le repli et leffacement de lhistorique`.

## Tâche 5 — assets locaux et métadonnées légères

**Files:** create tools knowledge-map.ts/spec et prepare-knowledge-map.ts ; assets knowledge/countries.json,map.json,manifest.json ; data/knowledge-data.ts/spec ; package scripts/lockfile, quiz ng-package.json pour dépendances.
**Consumes:** corpus géographique local épinglé, jamais les sources téléchargées au runtime.
**Produces:** `KnowledgeCountry={iso3:string;name:string;continent:string;anchor:readonly [number,number]}` ; `KnowledgeMap={version:1;countries:readonly {iso3:string;positions:number[];indices:number[];outlines:number[]}[]}` ; hash corpus déterministe précalculé ; `loadKnowledgeCountries(signal):Promise<KnowledgeCountry[]>`, `loadKnowledgeMap(signal):Promise<KnowledgeMap>` et manifeste avec version/provenance.

- [ ] Installer Three.js runtime, @types/three dev, earcut et d3-geo dev pour triangulation/clipping uniquement ; verrouiller versions. allowedNonPeerDependencies autorise Three, pas de globe.gl/Dexie.
- [ ] Tests rouges avec polygone à trou et rectangle antéméridien, fixtures FRA/RUS/FJI/USA :

```ts
const mesh=buildCountryMesh('FJI',fixtureGeometry);
expect(mesh.indices.length%3).toBe(0);
expect(mesh.positions.every(Number.isFinite)).toBe(true);
expect(maxTriangleEdgeAngle(mesh)).toBeLessThanOrEqual(5*Math.PI/180);
expect(coversHole(mesh,fixtureHoleCenter)).toBe(false);
```

Définir buildCountryMesh dans knowledge-map.ts et helpers de contrôle dans spec ; comparer aires et couverture aux géométries originales, pas seulement la forme du buffer.
- [ ] Run `npm test -- knowledge-map` rouge. Simplifier déterministement en conservant topologie ; découper en patches sphériques ≤30°, gérer winding/trous, projection tangent gnomonique locale, earcut puis inversion sur sphère unitaire. Subdiviser arêtes/triangles pour angle ≤5° ; rejet de trous remplis, coordonnées invalides ou couverture absente. Vérifier antéméridien et surfaces éloignées sans triangle traversant la sphère.
- [ ] Générer 195 métadonnées même si une île n’a pas de surface visible ; ancre intérieure au fragment principal, pas centroïde extérieur. Tri stable des assets, manifest transformations/tolérance/licences et version SHA du corpus préparé. Conserver silhouettes/countries.json existants strictement identiques.
- [ ] Ajouter `prepare:knowledge-map` = `tsx projects/games/quiz/tools/prepare-knowledge-map.ts` ; deux runs doivent être identiques, ≤50 000 sommets et ≤600 Ko gzip combinés. Valider assets unknown avant rendu et fetch annulable. Run tests verts/build:quiz ; commit `feat(quiz): prepare les assets locaux du globe`.

## Tâche 6 — capture de réponse et façade statistiques

**Files:** modify quiz.store.ts ; create quiz.store.spec.ts, store/create-answer-event.ts et quiz-statistics.store.ts/spec ; compléter data adapter et providers de showcase.
**Consumes:** reducer/catalogue existants, événements tâche 1, history service et métadonnées tâche 5.
**Produces:** UUID session par start effectif, événement immutable par transition ; statistics signals `filters/result/selectedIso3/loadState/historyStatus/view`, méthodes refresh/setContinent/setMode/selectCountry/setView/clear.

- [ ] Tests capture rouges :

```ts
store.dispatch({type:'answer',value:'not-in-domain'});
expect(history.capture).not.toHaveBeenCalled();
// validAnswerAction construit avec fixture/catalogue et mode actif réel.
store.dispatch(validAnswerAction);
store.dispatch(validAnswerAction);
expect(history.capture).toHaveBeenCalledTimes(1);
```

- [ ] Dans dispatch, capturer seulement action answer produisant answering→correction ; snapshot avant effets asynchrones, utiliser correct/awarded du reducer sans rejouer règle. Résoudre réponse canonique depuis catalogue, accepted IDs/labels et country cible. Aucun changement de Cash/correction. Injecter collecteur par token, no-op en showcase.
- [ ] Charger version légère une fois, pas hash des 11 Mo ; sessionId renouvelé uniquement si start crée partie. Tester dixième réponse/next, capitales multiples, neighbors, replay/settings, sortie route et quota sans attendre pour afficher correction.
- [ ] Test refresh concurrent :

```ts
const first=stats.refresh();
stats.setContinent('Africa');
await stats.refresh();
await first;
expect(stats.filters().continent).toBe('Africa');
expect(stats.result()!.overall.count).toBe(expectedAfricaCount);
```

- [ ] Refresh utilise beginRead, lots initiaux 1000, agrégation entre transactions, verifyRead et numéro de requête avant publication. Fusionner queue mémoire par id sans doublons ; vérifier génération après fusion. Lecture inaccessible affiche incomplete, pas empty. Clear/migration abandonne/recommence lecture. Batch invalide avance ; snapshot exclut insert >H jusqu’au refresh.
- [ ] Sélection pays et focus continent cohérents, 195 entrées à zéro ; modes historiques filtrables sans les réintroduire au jeu. Aucune import Three ni corpus complet depuis façade stats. Run ng test quiz ; commit `feat(quiz): collecte les reponses et expose les statistiques`.

## Tâche 7 — présentation dans le showcase

**Files:** create dix dossiers UI hors globe/page de la carte, tests et showcases ; modify styles quiz, game-core i18n/fr.json, dev routes/home et public-api pour showcases uniquement.
**Interfaces:** inputs Metrics/StatsResult/countries ; outputs filtres/selection/confirmation/retry ; LpDialog/LpButton pour confirmation ; aucun service dans UI.

- [ ] Définir showcases avant composants : empty, N=1/4/5, score zéro réel, N.A., semaine manquante, texte long, quota/corruption et focus continent.
- [ ] Tests comportementaux rouges :

```ts
expect(weeklyTable.textContent).toContain('N.A.');
expect(emptyWeekPoints).toHaveLength(0);
countryButton.click();
expect(selectedIso3).toBe('FRA');
```

- [ ] Implémenter trois KPI, Monde/continent, filter mode, type breakdown, liste recherche/tri et 195 pays, détail inline types/modes/effectifs, légende score/motifs, état vide pédagogique et statuts. Labels i18n depuis page/wrappers, pas de texte template brut.
- [ ] WeeklyTrend : deux séries SVG distinctes (réussite/score) sans double axe ; segments uniquement entre valeurs adjacentes non nulles ; tableau quatre semaines toujours disponible avec effectif/fuseau/semaine en cours. Les KPI restent cumulatifs.
- [ ] ClearHistoryDialog : annuler focalisé, Escape, focus restore ; pas de succès avant commit, état busy et erreur ; tests annulation/réessai. Test screen reader via noms/rôles, thèmes et reduced motion.
- [ ] Run `npx ng test quiz --watch=false`, tests UI si brique partagée modifiée ; revue showcase 320/360/390 px, paysage et zoom 200 %, cibles 44px, absence de débordement. Commit `feat(quiz): presente les connaissances et leur evolution`.

## Tâche 8 — globe 3D et ressources

**Files:** create globe-port.ts, three-globe.ts, globe-interactions.ts et tests ; knowledge-globe UI/showcase/spec ; module styles.
**Consumes:** KnowledgeMap et ReadonlyMap<string,KnowledgeLevel>, sélection/focus, ancres.
**Produces:**

```ts
interface GlobeHandle {
 update(levels:ReadonlyMap<string,KnowledgeLevel>,selectedIso3:string|null,continent:string|null):void;
 rotate(horizontal:number,vertical:number):void; zoom(delta:number):void;
 reset():void; dispose():void;
}
// createGlobe(host,map,{onSelect,onUnavailable,reducedMotion}) => GlobeHandle
```

- [ ] Tests rouges avec renderer/controls injectables : destruction deux fois sûre, aucun render hidden/destroyed, update invalide rendu, drag >6px ne sélectionne pas.
- [ ] Créer mer sphérique, surfaces rayon légèrement supérieur, classes/motif insuffisant via shader local, contours non interactifs ; raycast ISO3 mesh metadata. Hors continent atténué, sélection propose focus cohérent via output.
- [ ] OrbitControls zoom borné sans pan, rotation/tactile, drag distinct tap ; scroll de page préservé, molette seulement sur zone engagée ; boutons rotation/zoom/reset avec clavier/instructions. Marqueur d’ancre pour petites îles distinct de territoire.
- [ ] Render à la demande RAF unique ; pause viewport/document caché ; DPR≤1,5 et ResizeObserver ; reduced motion sans damping/transitions. Dispose géométries/matériaux/renderer/controls/listeners/observers ; context lost annonce repli, aucune perte liste/filtres.
- [ ] UI importe `../../globe/three-globe` dynamiquement seulement quand vue globe visible ; neutraliser import/fetch terminant après destroy. Trois renderer absent des barrels eager. Mode liste disponible avant import.
- [ ] Test réel Playwright clic pays, FJI depuis liste, drag/tap, perte contexte, clavier/reduced motion et cinq entrées/sorties. Run ng test quiz/build ; commit `feat(quiz): ajoute le globe interactif des connaissances`.

## Tâche 9 — navigation lazy et préchargement

**Files:** create statistics-route page/spec ; modify quiz routes/toolbar/result/showcases/game-route pour liens ; create portal app/routing/idle-preloading.ts/spec ; app.config/app.routes/dev.routes.
**Consumes:** façade/composants ; **Produces:** deep link `/quiz/statistiques` et Angular PreloadingStrategy.

- [ ] Tests rouges RouterTestingHarness deep link/retour/route vide exacte ; aucune instanciation de composants pendant preload, pas de Three.js sur jeu.
- [ ] Assembler page logique sans styles visuels, stats store route-scoped/history root, h1/titre/focus ; liens toolbar/résultat avec routerLink. Ne pas changer la modale de correction, ne pas introduire persistance de partie.

```ts
{path:'statistiques',data:{preload:true},loadComponent:()=>import('./ui/statistics-route/quiz-statistics-page').then(m=>m.QuizStatisticsPage)},
{path:'',pathMatch:'full',data:{preload:true},loadComponent:()=>import('./ui/game-route/quiz-page').then(m=>m.QuizPage)}
// provideRouter(routes, withPreloading(IdlePreloadingStrategy))
```

- [ ] Marquer pages produit, exclure dev et descendants. Queue séquentielle concatMap après NavigationEnd ; requestIdleCallback avec timeout/repli timer, différer pendant interaction/navigation ; scheduler annulable et sans maintien infini de l’instabilité Angular. saveData/2g/slow-2g => pas de preload ; connexion inconnue permise, catchError EMPTY isolé par route.
- [ ] Tests saveData, navigation avant callback, un import à la fois, erreurs, exclusion descendants, pas de DB/corpus/globe instancié. Vérifier service worker registerWhenStable installé normalement ; cache SW distinct de router import.
- [ ] Run ng test portal/quiz, build stats-json ; commit `feat(portal): precharge les pages et route les statistiques`.

## Tâche 10 — packaging, cache et budgets automatisés

**Files:** create tools measure-knowledge.mjs et tests helpers sous tools/knowledge-map.spec.ts ; package scripts ; ngsw-config.json/angular.json uniquement si assets nouveaux non couverts.
**Produces:** `npm run measure:knowledge` lisant build production/stats-json et baseline tâche 0, rapport tmp et exit nonzero si limites dépassées.

- [ ] Tester contrôle gzip sur fichiers artificiels trop lourds, graphe imports avec Three dans initial et double comptage partagé. Utiliser node:zlib ; Ko=1000 octets ; sommer contributions réellement incrémentales, pas uniquement nom de chunk.
- [ ] Implémenter rapport brut/gzip/code/assets/sommets et vérifier Three absent du flux réponse (≤10 Ko ajouté), route+globe ≤250 Ko, knowledge assets combinés ≤600 Ko/50k sommets. Corpus 11 Mo jamais fetch par stats. Conserver Angular budgets existants sans relèvement.
- [ ] Vérifier ngsw.json : app couvre tous les chunks JS et quiz-geography couvre knowledge assets ; ajouter règle seulement si couverture absente. SW cache le code sans import/évaluation ; le preload router l’évalue sans instancier page.

```powershell
npm run build:quiz
npm run build -- --stats-json
node projects/games/quiz/tools/measure-knowledge.mjs
```

- [ ] Mesurer chargement à froid/en cache, mode liste sans import globe, preload après initial. Optimiser simplification/imports avant proposer changement budget. Commit `test(quiz): controle le poids des statistiques`.

## Tâche 11 — E2E, accessibilité et mesures mobiles

**Files:** create knowledge-browser-helpers.mjs, verify-knowledge.mjs ; compléter measure-knowledge.mjs ; package scripts `verify:knowledge`/`measure:knowledge` ; pas de hook de test exposé en production.
**Consumes:** build production ; scripts existants verify-offline.mjs comme référence serveur/installation SW.
**Produces:** preuves sous tmp/knowledge-stats, aucun rapport fictif de performance.

- [ ] Installer @axe-core/playwright en dev et utiliser playwright déjà présent (pas de nouveau runner). Helper serveur SPA sûr, path borné, profil vierge, attente de cache de tout le manifeste ; seed fixtures IndexedDB via page.evaluate avec enveloppe et metadata correctes, pas de service global debug.
- [ ] Scénario principal avec node:assert, plus séries migration/concurrence :

```js
import assert from 'node:assert/strict';
await page.goto(origin+'/quiz/statistiques');
assert.equal(await page.getByRole('heading',{level:1}).count(),1);
await page.getByRole('button',{name:'Effacer l’historique',exact:true}).click();
await page.getByRole('button',{name:'Annuler',exact:true}).click();
// Après installation complète, serveur arrêté et réseau coupé :
await context.setOffline(true);
await page.reload();
assert.equal(await page.getByRole('heading',{level:1}).count(),1);
```

Les libellés exacts viennent des clés i18n ; waitFor sur éléments après reload avant assert. Les helpers restent dans outils de test.
- [ ] Chromium/Firefox/WebKit : persistance après reload, versions 0→1/plus récente, blocked/versionchange deux onglets, corruption préservée, retry/doublons, clear G simultané avec append ; quota/terminaison via factory d’adaptateur en tests unitaires et contrôle du statut en browser. Enregistrement réel d’une réponse et dixième réponse sur flux jeu.
- [ ] Offline profil vierge jamais visité stats : attendre installation complète depuis jeu/home, arrêter serveur et couper réseau, deep reload stats puis globe/liste/clear disponibles. Échec JS ne doit pas masquer tableau. Bloquer/loguer toute requête hors origine ; crédits externes ne sont pas activés par tests.
- [ ] axe sur tous états showcase/statistiques ; revue clavier/lecteur d’écran : choix continent/mode, liste→détail, commandes globe, reset et zoom, confirmation/Escape/focus. Revue 320/360/390 px + paysage et zoom navigateur réel 200 %, themes, reduced motion et cibles 44px. Une simple petite viewport n’est pas un test de zoom 200 %.
- [ ] Seed 0/1000/10000/100000 événements valides ; measure lecture+calcul et long tasks ; traces 30s de rotation/zoom/sélection, heap delta et buffers GPU/render targets estimés ; cinq visites puis dispose. Mesurer téléphone Android milieu de gamme réel, compatibilité Safari iOS réel ; consigner modèle/OS/browser/DPR/dimensions. Si appareils indisponibles, résultat non vérifié explicite, aucune assertion mobile passée.

```powershell
node projects/games/quiz/tools/verify-knowledge.mjs
node projects/games/quiz/tools/verify-offline.mjs
node projects/games/quiz/tools/measure-knowledge.mjs
```

- [ ] Budgets mobiles : lecture/calcul 100k ≤1s, ≥30fps/p95≤33ms, heap +50Mo, GPU estimé ≤32Mo. Si long tasks >50ms malgré lots, proposer worker et demander validation avant ajout ; ne pas relever seuils automatiquement.
- [ ] Commit `test(quiz): verifie les statistiques accessibles hors ligne`.

## Tâche 12 — revue finale et documentation durable

**Files:** docs/reference/domain-quiz-geographie.md, architecture.md, i18n-storage.md ; carte AGENTS/CLAUDE seulement si nouvelle référence créée ; spec/plan retirés seulement après réalisation et revue finale.

- [ ] Vérifier fichiers figés et sorties :

```powershell
npm test
npx ng test quiz --watch=false
npx ng test portal --watch=false
npx ng test game-core --watch=false
npm run build:quiz
npm run build -- --stats-json
node projects/games/quiz/tools/verify-knowledge.mjs
node projects/games/quiz/tools/verify-offline.mjs
node projects/games/quiz/tools/measure-knowledge.mjs
git diff --check
```

- [ ] Revue entière de branche suivant méthode choisie ; absence de modification quotes/Cash/correction/Duo, CDN/compte/télémétrie ; preuves de tous budgets et critères non vérifiés clairement signalés. Corriger puis retester uniquement ce que corrections affectent.
- [ ] Intégrer docs durables : schéma/barèmes/seuils, semaines et fuseau, génération/séquence/migrations/repli, assets/licences, route/preload/SW, commandes et mesures. Si critère matériel manque, ne pas clore comme terminé.
- [ ] À clôture effective, supprimer spec/plan intégrés (historique Git les conserve), commit `docs(quiz): documente lhistorique et les statistiques`. Mettre issue #16/projet à jour ; aucun push, PR ou déploiement sans instruction ultérieure.

## Auto-revue et couverture

Événement/validation (1) ; KPI/semaines/classes (2) ; DB/migrations (3) ; repli/effacement (4) ; données/cartographie (5) ; capture/statistics façade (6) ; showcase/UI/état vide/confirmation (7) ; globe/navigation équivalente (8) ; routes/preload (9) ; SW/poids (10) ; persistence réelle/a11y/offline/mobile/performance (11) ; docs (12).
Les cinq risques Review Focus ont chacun leurs tests assignés. Interfaces partagées définies avant consommateurs ; signatures repository et agrégation identiques dans toutes tâches. Tous chemins créés/modifiés sont identifiés ; pas d’implémentation/dépendance exécutée pendant rédaction. Les snippets sont des contrats et assertions de test, pas un produit scaffoldé.

## Approbation et exécution

Le joueur approuve ce plan écrit et choisit la méthode avant exécution. Recommandation : **native**, même agent pour toutes tâches, revue indépendante finale ; les interfaces persistence/capture/globe sont liées et le parallélisme ne raccourcit pas cette chaîne. Alternative : **sous-agents**, implémenteur et relecteur par tâche puis revue complète, coût de contexte supérieur et contrôles plus fréquents.
Même après approbation, main doit contenir le retrait de Duo. Aucune branche de retrait fusionnée automatiquement, aucun rebase déclenché pendant rédaction du plan.

## Exécution autorisée (2026-10-08)

Spec et plan approuvés dans la conversation. L'instruction suivante du joueur a remplacé le prérequis main par develop : rebase effectué sur 5bcb07b, qui contient le retrait de Duo (90ef992). Modes réellement disponibles : Cash 5 points, Carré 3. Implémentation en place ; validations matérielles encore ouvertes.
