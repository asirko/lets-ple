# Validation locale des connaissances Geoquizz

2026-10-08. Les fichiers spec/plan restent présents tant que les contrôles matériels sont ouverts.

```json
{
  "base": "develop e6f1ee2",
  "branch": "codex/quiz-stats-country-dialog",
  "unit": {
    "domain": 320,
    "quiz": 66,
    "portal": 57,
    "gameCore": 23
  },
  "productionBuild": true,
  "isolatedQuizBuild": true,
  "chromiumOffline": true,
  "axeEmptyPopulated": true,
  "realTenAnswers": true,
  "crossTabClear": true,
  "webglLossFallback": true,
  "smallWidths": [
    320,
    360,
    390
  ],
  "noExternalRequests": true,
  "review": "Fresh gpt-6-astra review; findings addressed with regression coverage.",
  "bundle": {
    "baselineRef": "106866e",
    "sharedThreeChunkCount": 1,
    "bothGlobesUseSameThree": true,
    "flowDeltaGzipBytes": 8578,
    "statisticsAndGlobeGzipBytes": 158176,
    "knowledgeAssetsGzipBytes": 221942,
    "vertices": 17881,
    "threeInInitial": false,
    "threeInQuizFlow": false,
    "realMobilePerformance": "not measured",
    "gpuMemory": "requires runtime estimate",
    "heapMemory": "requires runtime measurement"
  },
  "pending": [
    "Android and iOS real-device measurements",
    "Firefox/WebKit (binaries unavailable locally)",
    "real browser zoom 200% and screen reader",
    "30 second real-device gesture trace and FPS",
    "100k performance target on real mobile"
  ],
  "noPushOrDeployment": true,
  "sharedThreeRuntime": true,
  "correctionBrowserVerified": true,
  "keyboardGlobeAndDefaultDesktopWheel": true,
  "touchPassiveScrollAndActivation": true,
  "countryListRemoved": true,
  "countryPicker": true,
  "countryDetailModal": true,
  "countryNamesOnGlobe": true,
  "interfaceReview": "Independent review: no concrete findings."
}
```

## Arbitrages

- Base develop à la demande du joueur ; retrait Duo déjà intégré.
- fixtures.ts comme utilitaire de tests, sans faux test vide.
- Six faces gnomoniques plutôt que découpes à 30 degrés ; mêmes contraintes géométriques, moins de sommets. Risque : simplification à reprendre si défaut visuel.
- Showcases importés directement par dev, pour garder le flux jeu sous 10 Ko gzip. Risque : export dev à réorganiser si packaging évolue.
- Un lancement par opportunité idle, sans attendre la complétion parent qui dépend de ses enfants. Risque : téléchargements concomitants.
- getAll borné plutôt que curseur par réponse, lots de 1000 conservés après comparaison avec 4000 sans gain net. Risque : davantage de mémoire et de latence par lot ; ajustement obligatoire si téléphone dépasse le budget.

Aucun point mineur différé issu de la revue. Les contrôles non vérifiés ne sont pas annoncés comme passés.

## Mesures desktop et limite ouverte

Build production : delta flux jeu 8 685 octets gzip ; statistics+globe 157 248 ; assets 221 934 ; 17 881 sommets. Three.js absent de la fermeture statique initiale et du jeu.

Node 24.18 Windows : calcul pur 100 000 réponses ≈69 ms. Chromium Windows/SwiftShader 390×844 DPR1 : lecture+affichage ≈1,5s, aucune tâche longue de lecture détectée ; cinq visites/libérations, delta heap ≈0,53Mo ; GPU estimé ≈4,76Mo (buffers/render targets, pas allocation driver). L'objectif 1s ne passe pas sur ce poste et demeure ouvert. L'essai de lots 4000 n'a pas apporté de gain net ; retour à 1000 pour borner la mémoire. Aucun worker ajouté : la mesure n'a pas révélé de tâche longue >50ms.

Les rapports détaillés locaux sont dans tmp/knowledge-stats. Les mesures sur téléphone et la trace d'interaction restent indispensables avant clôture.

## Rebase et harmonisation Three.js (2026-10-08)

Rebase sur develop 106866e, incluant la correction 3D. Conflits résolus en conservant la modale, sa sélection du pays et les deux ensembles de traductions. Runtime partagé pour création/configuration, contrôles, RAF/visibilité et libération WebGL ; couches de dessin spécifiques conservées. Une seule version et un seul chunk Three.js, import dynamique dans les deux vues. DPR désormais plafonné à 1,5 également dans la correction.

63 tests quiz passent ; build production et paquet isolé passent. Scripts verify-correction et verify-knowledge passent, dont context loss, libération GPU, navigation, dix réponses et fonctionnement hors ligne. Nouveau delta jeu 8 301 octets gzip, statistiques+globe 157 852, assets 221 942. La référence de comparaison est reconstruite depuis 106866e. Les mesures matérielles et le seuil 100k restent ouverts.

## Navigation pays revue (2026-10-08)

Demandes validées en conversation : retrait de la liste exhaustive et des boutons de rotation/zoom/reset ; sélecteur natif compact pour clavier et repli WebGL ; clic/tap sur la carte ouvre LpDialog avec détails pays. Les noms français utilisent le même utilitaire de projection/placement et les mêmes styles que la correction. Molette active dès l'ouverture sur desktop ; gestes activables sur tactile pour conserver le scroll.

Parcours vérifiés : sélection carte/sélecteur, réouverture du même pays, Échap/bouton de fermeture et restauration du focus, axe de la modale, showcase rouvrable, scroll tactile passif puis rotation activée, 320/360/390 px sans débordement. Script verify-knowledge-inputs couvre en plus le détail avec un nom long jusqu'à 640 px CSS ; ce contrôle ne valide pas le zoom navigateur réel. Revue indépendante sans constat. 320 tests métier passent avec concurrence bornée à deux workers après trois timeouts sous validations lourdes parallèles (invariants, difficulty, prepare) ; 66 quiz, 57 portail, 23 game-core passent ; build production et isolé quiz passent.

Budget courant : delta jeu 8578 octets gzip ; stats+globe 158176 ; assets 221942 ; toujours un seul chunk Three.js lazy. Cinq sorties de route libèrent le globe ; GPU estimé ≈4,76 Mo, lecture/affichage 100k ≈1,8 s dans la mesure desktop avec charge concurrente. Les critères matériels et le seuil d'une seconde restent ouverts.


## Précision des contours — 8 octobre 2026

Choix utilisateur : simplification 0,08 degré. Génération locale : 39 682 sommets, 542 894 octets gzip (sans nouvelles lignes finales). Budget des assets relevé à 600 Ko gzip ; limite de sommets inchangée. Les mesures sur téléphone réel restent à effectuer.

Validation : 3 tests de géométrie passent, régénération déterministe, build production réussi. Rapport bundle : 542 902 octets gzip avec fins de ligne, 39 682 sommets, JavaScript inchangé (stats+globe 158 176 octets gzip), un seul chunk Three.js partagé. Vérification navigateur réussie : 195 pays, hors ligne après installation, sélection carte/modal, molette desktop, clavier, repli WebGL, axe et largeurs 320/360/390. Revue indépendante sans problème relevé.
