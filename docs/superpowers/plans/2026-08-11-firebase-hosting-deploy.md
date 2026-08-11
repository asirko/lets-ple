# Déploiement Firebase Hosting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire déployer automatiquement le portail (`dist/portal/browser`) sur Firebase Hosting,
sous `lets-ple.lets-code.fr`, via GitHub Actions à chaque push sur `main`, en remplacement du
déploiement GitHub Pages jamais implémenté (tâche 18 du plan v1).

**Architecture:** Deux fichiers de config Firebase à la racine (`firebase.json`, `.firebaserc`)
décrivant quoi déployer et où ; un unique workflow GitHub Actions
(`.github/workflows/ci.yml`) qui reprend le socle déjà décidé (tests, `validate:quotes`, build
portail, build storybook) et ajoute une étape de déploiement conditionnée à `main`, via l'action
`FirebaseExtended/action-hosting-deploy`.

**Tech Stack:** Firebase Hosting, `firebase-tools` (CLI, en devDependency pour les tests locaux),
GitHub Actions, `FirebaseExtended/action-hosting-deploy@v0`.

## Global Constraints

- Node **≥ 24.15.0**, déjà épinglé dans `.nvmrc` (`24.15.0`) — le workflow CI doit lire cette
  version, pas la coder en dur une deuxième fois.
- Commits : `type(scope): sujet` sans accents dans le sujet (`docs/conventions/commits.md`).
  `chore` pour les fichiers de configuration transverses (pas de scope naturel unique) ; `docs`
  pour la mise à jour du plan v1.
- Ce plan **ne push jamais vers `origin`** et ne crée aucun secret GitHub à la place de
  l'utilisateur — ce sont des actions manuelles couvertes par
  `docs/superpowers/specs/2026-08-11-hebergement-firebase-design.md`.
- Ce plan **dépend de deux valeurs fournies par l'utilisateur**, obtenues au fil des tâches, jamais
  inventées : l'ID exact du projet Firebase (créé à l'étape A du guide de la spec) et le nom du
  secret GitHub contenant le compte de service (étape F). Aucune tâche ne doit être exécutée avec
  une valeur substituée à la main par l'agent.

---

## File Structure

```
firebase.json                       config Hosting : dossier public, réécriture SPA, en-têtes
.firebaserc                         associe le dépôt à l'ID de projet Firebase réel
.github/workflows/ci.yml            tests + build + déploiement conditionnel sur main
docs/superpowers/plans/2026-07-28-lets-ple-v1.md   tâche 18 réécrite pour Firebase
package.json                        + firebase-tools en devDependency (test local uniquement)
```

Aucun fichier GitHub Pages (`public/404.html`, `public/.nojekyll`, `public/CNAME`) n'existe dans le
dépôt — la tâche 18 originale n'a jamais été implémentée. Rien à supprimer.

---

### Task 1: Configuration Firebase Hosting (`firebase.json`, `.firebaserc`)

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`

**Interfaces:**
- Consumes: le dossier de build existant `dist/portal/browser` (confirmé par `ng build portal` —
  contient `index.html`, `ngsw.json`, `ngsw-worker.js`, `manifest.webmanifest`,
  `content/quotes/*.json`, assets hashés).
- Produces: `.firebaserc` avec le projet par défaut, consommé par Task 2 (émulateur local) et
  Task 3 (déploiement CI, via `projectId` dans le workflow).

- [ ] **Step 1: Obtenir l'ID exact du projet Firebase**

Demander à l'utilisateur l'ID du projet créé à l'étape A du guide
(`docs/superpowers/specs/2026-08-11-hebergement-firebase-design.md`) — **pas le nom affiché**,
l'ID technique, visible dans la console Firebase sous ⚙️ Paramètres du projet → Général → « ID du
projet » (ex. `lets-ple-a1b2c` si le nom voulu était déjà pris). Ne pas continuer tant que cette
valeur n'est pas confirmée par l'utilisateur.

- [ ] **Step 2: Écrire `firebase.json`**

```json
{
  "hosting": {
    "public": "dist/portal/browser",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "headers": [
      {
        "source": "ngsw.json",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache" }
        ]
      }
    ],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

`rewrites` fait le fallback SPA : toute route inconnue de Hosting (ex. `/cryptogramme` rechargé)
sert `index.html`, et c'est Angular Router qui prend la main côté client. L'en-tête `no-cache` sur
`ngsw.json` évite qu'un navigateur retarde la détection de mise à jour du service worker Angular en
gardant une version obsolète en cache.

- [ ] **Step 3: Écrire `.firebaserc`**

Remplacer `<FIREBASE_PROJECT_ID>` par la valeur obtenue à l'étape 1 :

```json
{
  "projects": {
    "default": "<FIREBASE_PROJECT_ID>"
  }
}
```

- [ ] **Step 4: Vérifier la syntaxe JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('firebase.json', 'utf8')); JSON.parse(require('fs').readFileSync('.firebaserc', 'utf8')); console.log('JSON valide')"
```
Expected: `JSON valide`, aucune erreur de parsing.

- [ ] **Step 5: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "chore: configuration firebase hosting"
```

---

### Task 2: Vérification locale via l'émulateur Hosting

**Files:**
- Modify: `package.json` (devDependencies), `package-lock.json`

**Interfaces:**
- Consumes: `firebase.json`/`.firebaserc` (Task 1), `dist/portal/browser` (produit par
  `npm run build`, script déjà existant).
- Produces: rien de consommé par une tâche suivante — cette tâche est une vérification, pas une
  dépendance.

- [ ] **Step 1: Installer `firebase-tools` en devDependency**

```bash
npm install -D firebase-tools
```

- [ ] **Step 2: Construire le portail**

```bash
npm run build
```
Expected: build réussi, `dist/portal/browser/index.html` présent.

- [ ] **Step 3: Lancer l'émulateur Hosting**

```bash
npx firebase emulators:start --only hosting
```
Expected: le CLI démarre et affiche une URL locale (par défaut `http://127.0.0.1:5000`). Si le CLI
réclame une connexion (« Not logged in »), lancer `npx firebase login` dans un terminal interactif
(ouvre le navigateur) puis relancer cette étape — connexion à faire une seule fois sur la machine.

- [ ] **Step 4: Vérifier le fallback SPA depuis un autre terminal**

```bash
curl -s http://127.0.0.1:5000/cryptogramme | grep -o '<title>[^<]*</title>'
```
Expected: le titre de `index.html` (pas une page d'erreur 404) — confirme que `rewrites` fonctionne
sur une route profonde rechargée directement, exactement le scénario qui cassait sans lui.

Arrêter l'émulateur (`Ctrl+C` dans le terminal où il tourne) une fois la vérification faite.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: ajoute firebase-tools pour les tests locaux de hosting"
```

---

### Task 3: Workflow GitHub Actions (build, tests, déploiement)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `.firebaserc`/`firebase.json` (Task 1) ; scripts npm existants
  `npm test`, `npm run validate:quotes`, `npm run build`, `npm run build-storybook`
  (`package.json`) ; `.nvmrc` (`24.15.0`).
- Produces: rien de consommé par une tâche suivante de ce plan — dernière étape du pipeline.

- [ ] **Step 1: Confirmer le nom du secret GitHub avec l'utilisateur**

Le nom retenu pour ce plan est `FIREBASE_SERVICE_ACCOUNT_LETS_PLE`. Demander à l'utilisateur de
confirmer que c'est bien sous ce nom qu'il a enregistré (ou va enregistrer) le JSON du compte de
service à l'étape F du guide — sinon utiliser le nom qu'il a réellement choisi partout où ce
document écrit `FIREBASE_SERVICE_ACCOUNT_LETS_PLE`. Ne pas committer le workflow tant que ce nom
n'est pas confirmé.

- [ ] **Step 2: Écrire `.github/workflows/ci.yml`**

Remplacer `<FIREBASE_PROJECT_ID>` par la même valeur qu'à la Task 1 Step 1, et
`FIREBASE_SERVICE_ACCOUNT_LETS_PLE` par le nom confirmé à l'étape précédente si différent :

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - run: npm ci

      - run: npm test

      - run: npm run validate:quotes

      - run: npm run build

      - run: npm run build-storybook

      - name: Deployer sur Firebase Hosting
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_LETS_PLE }}'
          channelId: live
          projectId: <FIREBASE_PROJECT_ID>
```

`pull_request` déclenche le job sans l'étape de déploiement (la condition `if` la limite à un push
sur `main`) — les PR profitent quand même de tests/build/validate:quotes comme filet avant fusion.

- [ ] **Step 3: Valider la syntaxe YAML**

```bash
node -e "const yaml = require('js-yaml'); yaml.load(require('fs').readFileSync('.github/workflows/ci.yml', 'utf8')); console.log('YAML valide')" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML valide')"
```
Expected: `YAML valide`. Si ni `js-yaml` ni `python3`/`pyyaml` ne sont disponibles, relire le
fichier à l'œil pour l'indentation (2 espaces, cohérente) avant de continuer.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore: pipeline ci et deploiement firebase hosting"
```

- [ ] **Step 5: Note de vérification finale, hors CI locale**

Ce workflow ne peut être vérifié bout en bout que sur GitHub (les secrets n'existent pas en local).
Une fois poussé sur `main` — action que l'utilisateur déclenche lui-même, jamais automatiquement —
vérifier dans l'onglet Actions du dépôt que le job passe au vert et que
`https://lets-ple.lets-code.fr` sert la nouvelle version.

---

### Task 4: Mettre à jour la tâche 18 du plan v1

**Files:**
- Modify: `docs/superpowers/plans/2026-07-28-lets-ple-v1.md` (section « Tâche 18 »)

**Interfaces:**
- Consumes: rien (tâche documentaire).
- Produces: rien.

- [ ] **Step 1: Remplacer le contenu de la Tâche 18**

Dans `docs/superpowers/plans/2026-07-28-lets-ple-v1.md`, remplacer la section actuelle (de
`### Tâche 18 : Intégration continue et déploiement` jusqu'au `---` qui la suit, étapes 1 à 6
toujours non cochées, ciblant GitHub Pages) par :

```markdown
### Tâche 18 : Intégration continue et déploiement

**Remplacée par** `docs/superpowers/specs/2026-08-11-hebergement-firebase-design.md` et
`docs/superpowers/plans/2026-08-11-firebase-hosting-deploy.md` — la cible de déploiement est
Firebase Hosting (`lets-ple.lets-code.fr`), pas GitHub Pages. Les trois fichiers
`404.html`/`.nojekyll`/`CNAME` spécifiques à Pages, mentionnés dans la version originale de cette
tâche, ne s'appliquent plus : Firebase Hosting gère le fallback SPA et le domaine personnalisé
autrement (voir le nouveau plan).
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-28-lets-ple-v1.md
git commit -m "docs: tache 18 remplacee par le plan de deploiement firebase"
```

---

## Vérification de bout en bout (après exécution complète du plan, une fois pushé)

```bash
npm test                     # tests domaine
npm run validate:quotes      # corpus conforme
npm run build                # build du portail
npm run build-storybook      # atelier construit
npx firebase emulators:start --only hosting   # rewrite SPA vérifiable en local
```

**Après push sur `main` (déclenché par l'utilisateur) :**
1. Onglet Actions du dépôt GitHub : le job `build` passe au vert, y compris l'étape de déploiement.
2. `https://lets-ple.lets-code.fr` sert le portail avec certificat TLS valide.
3. Une route profonde (`/cryptogramme`) rechargée directement fonctionne, pas de 404.
