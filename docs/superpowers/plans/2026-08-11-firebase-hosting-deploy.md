# DÃ©ploiement Firebase Hosting â€” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire dÃ©ployer automatiquement le portail (`dist/portal/browser`) sur Firebase Hosting,
sous `lets-ple.lets-code.fr`, via GitHub Actions Ã  chaque push sur `main`, en remplacement du
dÃ©ploiement GitHub Pages jamais implÃ©mentÃ© (tÃ¢che 18 du plan v1).

**Architecture:** Deux fichiers de config Firebase Ã  la racine (`firebase.json`, `.firebaserc`)
dÃ©crivant quoi dÃ©ployer et oÃ¹ ; un unique workflow GitHub Actions
(`.github/workflows/ci.yml`) qui reprend le socle dÃ©jÃ  dÃ©cidÃ© (tests, `validate:quotes`, build
portail, build storybook) et ajoute une Ã©tape de dÃ©ploiement conditionnÃ©e Ã  `main`, via l'action
`FirebaseExtended/action-hosting-deploy`.

**Tech Stack:** Firebase Hosting, `firebase-tools` (CLI, en devDependency pour les tests locaux),
GitHub Actions, `FirebaseExtended/action-hosting-deploy@v0`.

## Global Constraints

- Node **â‰¥ 24.15.0**, dÃ©jÃ  Ã©pinglÃ© dans `.nvmrc` (`24.15.0`) â€” le workflow CI doit lire cette
  version, pas la coder en dur une deuxiÃ¨me fois.
- Commits : `type(scope): sujet` sans accents dans le sujet (`docs/conventions/commits.md`).
  `chore` pour les fichiers de configuration transverses (pas de scope naturel unique) ; `docs`
  pour la mise Ã  jour du plan v1.
- Ce plan **ne push jamais vers `origin`** et ne crÃ©e aucun secret GitHub Ã  la place de
  l'utilisateur â€” ce sont des actions manuelles couvertes par
  `docs/superpowers/specs/2026-08-11-hebergement-firebase-design.md`.
- Ce plan **dÃ©pend de deux valeurs fournies par l'utilisateur**, obtenues au fil des tÃ¢ches, jamais
  inventÃ©es : l'ID exact du projet Firebase (crÃ©Ã© Ã  l'Ã©tape A du guide de la spec) et le nom du
  secret GitHub contenant le compte de service (Ã©tape F). Aucune tÃ¢che ne doit Ãªtre exÃ©cutÃ©e avec
  une valeur substituÃ©e Ã  la main par l'agent.

---

## File Structure

```
firebase.json                       config Hosting : dossier public, rÃ©Ã©criture SPA, en-tÃªtes
.firebaserc                         associe le dÃ©pÃ´t Ã  l'ID de projet Firebase rÃ©el
.github/workflows/ci.yml            tests + build + dÃ©ploiement conditionnel sur main
docs/superpowers/plans/2026-07-28-lets-ple-v1.md   tÃ¢che 18 rÃ©Ã©crite pour Firebase
package.json                        + firebase-tools en devDependency (test local uniquement)
```

Aucun fichier GitHub Pages (`public/404.html`, `public/.nojekyll`, `public/CNAME`) n'existe dans le
dÃ©pÃ´t â€” la tÃ¢che 18 originale n'a jamais Ã©tÃ© implÃ©mentÃ©e. Rien Ã  supprimer.

---

### Task 1: Configuration Firebase Hosting (`firebase.json`, `.firebaserc`)

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`

**Interfaces:**
- Consumes: le dossier de build existant `dist/portal/browser` (confirmÃ© par `ng build portal` â€”
  contient `index.html`, `ngsw.json`, `ngsw-worker.js`, `manifest.webmanifest`,
  `content/quotes/*.json`, assets hashÃ©s).
- Produces: `.firebaserc` avec le projet par dÃ©faut, consommÃ© par Task 2 (Ã©mulateur local) et
  Task 3 (dÃ©ploiement CI, via `projectId` dans le workflow).

- [x] **Step 1: Obtenir l'ID exact du projet Firebase**

Demander Ã  l'utilisateur l'ID du projet crÃ©Ã© Ã  l'Ã©tape A du guide
(`docs/superpowers/specs/2026-08-11-hebergement-firebase-design.md`) â€” **pas le nom affichÃ©**,
l'ID technique, visible dans la console Firebase sous âš™ï¸ ParamÃ¨tres du projet â†’ GÃ©nÃ©ral â†’ Â« ID du
projet Â» (ex. `lets-ple-a1b2c` si le nom voulu Ã©tait dÃ©jÃ  pris). Ne pas continuer tant que cette
valeur n'est pas confirmÃ©e par l'utilisateur.

- [x] **Step 2: Ã‰crire `firebase.json`**

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

`rewrites` fait le fallback SPA : toute route inconnue de Hosting (ex. `/cryptogramme` rechargÃ©)
sert `index.html`, et c'est Angular Router qui prend la main cÃ´tÃ© client. L'en-tÃªte `no-cache` sur
`ngsw.json` Ã©vite qu'un navigateur retarde la dÃ©tection de mise Ã  jour du service worker Angular en
gardant une version obsolÃ¨te en cache.

- [x] **Step 3: Ã‰crire `.firebaserc`**

Remplacer `<FIREBASE_PROJECT_ID>` par la valeur obtenue Ã  l'Ã©tape 1 :

```json
{
  "projects": {
    "default": "<FIREBASE_PROJECT_ID>"
  }
}
```

- [x] **Step 4: VÃ©rifier la syntaxe JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('firebase.json', 'utf8')); JSON.parse(require('fs').readFileSync('.firebaserc', 'utf8')); console.log('JSON valide')"
```
Expected: `JSON valide`, aucune erreur de parsing.

- [x] **Step 5: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "chore: configuration firebase hosting"
```

---

### Task 2: VÃ©rification locale via l'Ã©mulateur Hosting

**Files:**
- Modify: `package.json` (devDependencies), `package-lock.json`

**Interfaces:**
- Consumes: `firebase.json`/`.firebaserc` (Task 1), `dist/portal/browser` (produit par
  `npm run build`, script dÃ©jÃ  existant).
- Produces: rien de consommÃ© par une tÃ¢che suivante â€” cette tÃ¢che est une vÃ©rification, pas une
  dÃ©pendance.

- [x] **Step 1: Installer `firebase-tools` en devDependency**

```bash
npm install -D firebase-tools
```

- [x] **Step 2: Construire le portail**

```bash
npm run build
```
Expected: build rÃ©ussi, `dist/portal/browser/index.html` prÃ©sent.

- [x] **Step 3: Lancer l'Ã©mulateur Hosting**

```bash
npx firebase emulators:start --only hosting
```
Expected: le CLI dÃ©marre et affiche une URL locale (par dÃ©faut `http://127.0.0.1:5000`). Si le CLI
rÃ©clame une connexion (Â« Not logged in Â»), lancer `npx firebase login` dans un terminal interactif
(ouvre le navigateur) puis relancer cette Ã©tape â€” connexion Ã  faire une seule fois sur la machine.

- [x] **Step 4: VÃ©rifier le fallback SPA depuis un autre terminal**

```bash
curl -s http://127.0.0.1:5000/cryptogramme | grep -o '<title>[^<]*</title>'
```
Expected: le titre de `index.html` (pas une page d'erreur 404) â€” confirme que `rewrites` fonctionne
sur une route profonde rechargÃ©e directement, exactement le scÃ©nario qui cassait sans lui.

ArrÃªter l'Ã©mulateur (`Ctrl+C` dans le terminal oÃ¹ il tourne) une fois la vÃ©rification faite.

- [x] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: ajoute firebase-tools pour les tests locaux de hosting"
```

---

### Task 3: Workflow GitHub Actions (build, tests, dÃ©ploiement)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `.firebaserc`/`firebase.json` (Task 1) ; scripts npm existants
  `npm test`, `npm run validate:quotes`, `npm run build`, `npm run build-storybook`
  (`package.json`) ; `.nvmrc` (`24.15.0`).
- Produces: rien de consommÃ© par une tÃ¢che suivante de ce plan â€” derniÃ¨re Ã©tape du pipeline.

- [x] **Step 1: Confirmer le nom du secret GitHub avec l'utilisateur**

Le nom retenu pour ce plan est `FIREBASE_SERVICE_ACCOUNT_LETS_PLE`. Demander Ã  l'utilisateur de
confirmer que c'est bien sous ce nom qu'il a enregistrÃ© (ou va enregistrer) le JSON du compte de
service Ã  l'Ã©tape F du guide â€” sinon utiliser le nom qu'il a rÃ©ellement choisi partout oÃ¹ ce
document Ã©crit `FIREBASE_SERVICE_ACCOUNT_LETS_PLE`. Ne pas committer le workflow tant que ce nom
n'est pas confirmÃ©.

- [x] **Step 2: Ã‰crire `.github/workflows/ci.yml`**

Remplacer `<FIREBASE_PROJECT_ID>` par la mÃªme valeur qu'Ã  la Task 1 Step 1, et
`FIREBASE_SERVICE_ACCOUNT_LETS_PLE` par le nom confirmÃ© Ã  l'Ã©tape prÃ©cÃ©dente si diffÃ©rent :

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

`pull_request` dÃ©clenche le job sans l'Ã©tape de dÃ©ploiement (la condition `if` la limite Ã  un push
sur `main`) â€” les PR profitent quand mÃªme de tests/build/validate:quotes comme filet avant fusion.

- [x] **Step 3: Valider la syntaxe YAML**

```bash
node -e "const yaml = require('js-yaml'); yaml.load(require('fs').readFileSync('.github/workflows/ci.yml', 'utf8')); console.log('YAML valide')" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML valide')"
```
Expected: `YAML valide`. Si ni `js-yaml` ni `python3`/`pyyaml` ne sont disponibles, relire le
fichier Ã  l'Å“il pour l'indentation (2 espaces, cohÃ©rente) avant de continuer.

- [x] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore: pipeline ci et deploiement firebase hosting"
```

- [x] **Step 5: Note de vÃ©rification finale, hors CI locale**

Ce workflow ne peut Ãªtre vÃ©rifiÃ© bout en bout que sur GitHub (les secrets n'existent pas en local).
Une fois poussÃ© sur `main` â€” action que l'utilisateur dÃ©clenche lui-mÃªme, jamais automatiquement â€”
vÃ©rifier dans l'onglet Actions du dÃ©pÃ´t que le job passe au vert et que
`https://lets-ple.lets-code.fr` sert la nouvelle version.

---

### Task 4: Mettre Ã  jour la tÃ¢che 18 du plan v1

**Files:**
- Modify: `docs/superpowers/plans/2026-07-28-lets-ple-v1.md` (section Â« TÃ¢che 18 Â»)

**Interfaces:**
- Consumes: rien (tÃ¢che documentaire).
- Produces: rien.

- [x] **Step 1: Remplacer le contenu de la TÃ¢che 18**

Dans `docs/superpowers/plans/2026-07-28-lets-ple-v1.md`, remplacer la section actuelle (de
`### TÃ¢che 18 : IntÃ©gration continue et dÃ©ploiement` jusqu'au `---` qui la suit, Ã©tapes 1 Ã  6
toujours non cochÃ©es, ciblant GitHub Pages) par :

```markdown
### TÃ¢che 18 : IntÃ©gration continue et dÃ©ploiement

**RemplacÃ©e par** `docs/superpowers/specs/2026-08-11-hebergement-firebase-design.md` et
`docs/superpowers/plans/2026-08-11-firebase-hosting-deploy.md` â€” la cible de dÃ©ploiement est
Firebase Hosting (`lets-ple.lets-code.fr`), pas GitHub Pages. Les trois fichiers
`404.html`/`.nojekyll`/`CNAME` spÃ©cifiques Ã  Pages, mentionnÃ©s dans la version originale de cette
tÃ¢che, ne s'appliquent plus : Firebase Hosting gÃ¨re le fallback SPA et le domaine personnalisÃ©
autrement (voir le nouveau plan).
```

- [x] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-28-lets-ple-v1.md
git commit -m "docs: tache 18 remplacee par le plan de deploiement firebase"
```

---

## VÃ©rification de bout en bout (aprÃ¨s exÃ©cution complÃ¨te du plan, une fois pushÃ©)

```bash
npm test                     # tests domaine
npm run validate:quotes      # corpus conforme
npm run build                # build du portail
npm run build-storybook      # atelier construit
npx firebase emulators:start --only hosting   # rewrite SPA vÃ©rifiable en local
```

**AprÃ¨s push sur `main` (dÃ©clenchÃ© par l'utilisateur) :**
1. Onglet Actions du dÃ©pÃ´t GitHub : le job `build` passe au vert, y compris l'Ã©tape de dÃ©ploiement.
2. `https://lets-ple.lets-code.fr` sert le portail avec certificat TLS valide.
3. Une route profonde (`/cryptogramme`) rechargÃ©e directement fonctionne, pas de 404.

