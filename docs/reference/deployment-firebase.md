# Déploiement — Firebase Hosting

Le portail (`dist/portal/browser`) est déployé sur **Firebase Hosting**, sous
`lets-ple.lets-code.fr` (domaine OVH), via GitHub Actions à chaque push sur `main`.

## Pourquoi Firebase plutôt que GitHub Pages

| Option | Pour | Contre |
|---|---|---|
| GitHub Pages | Zéro compte supplémentaire, statique pur, gratuit sans limite pratique | Aucun backend : le jour où comptes/scores/notifications/paiement arrivent, il faudrait de toute façon adosser un service tiers — double infrastructure |
| **Firebase Hosting (retenu)** | Même écosystème pour l'hébergement statique d'aujourd'hui et Auth/Firestore/Functions/paiement de demain ; un seul projet, un seul CLI, une seule facturation à terme ; TLS et domaine personnalisé gérés automatiquement | Compte Google Cloud à créer/maintenir ; CLI supplémentaire (`firebase-tools`) |
| Cloudflare Pages + Workers | Aussi généraliste, bon niveau gratuit | Écosystème plus éclaté pour auth/paiement, pas de raison de le préférer une fois Firebase choisi |

Décision confirmée par l'utilisateur : la trajectoire produit (comptes individuels et d'équipe,
scores, notifications, paiement) rend la cohérence d'écosystème plus importante que la simplicité
immédiate de GitHub Pages.

## Architecture cible

```
Projet Firebase "lets-ple"
├─ Hosting          sert dist/portal/browser (build Angular) — seule pièce utilisée aujourd'hui
├─ Authentication    service activé, AUCUN fournisseur configuré (choix différé)
└─ Firestore         base créée, région europe-west9 (Paris), mode production, AUCUNE collection

Domaine : lets-ple.lets-code.fr → Firebase Hosting (flux CNAME simplifié)
DNS : géré chez OVH, zone DNS de lets-code.fr
CI/CD : GitHub Actions, déploiement via un compte de service Firebase (secret GitHub)
```

- **Région Firestore = `europe-west9` (Paris)**, choix irréversible sans recréer la base — décidé
  une fois pour ne pas avoir à y revenir. Mono-région, pas `eur3` multi-région : latence minimale
  pour un public francophone, résilience légèrement moindre jugée suffisante à cette taille.
- **Auth et Firestore restent vides** tant qu'aucune fonctionnalité ne les consomme — chaque usage
  réel mérite son propre brainstorming le moment venu, en particulier pour les règles de sécurité
  Firestore.
- Cloud Functions, FCM, paiement (Stripe) : hors scope, rien n'est provisionné, pas de date.

## Configuration du dépôt

`firebase.json` :

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
`ngsw.json` évite qu'un navigateur retarde la détection de mise à jour du service worker Angular.

`.firebaserc` associe le dépôt à l'ID de projet Firebase réel :

```json
{
  "projects": {
    "default": "lets-b6c11"
  }
}
```

Aucun fichier spécifique à GitHub Pages (`public/404.html`, `public/.nojekyll`, `public/CNAME`)
n'existe dans le dépôt — Firebase Hosting gère nativement le fallback SPA via `firebase.json` et le
domaine personnalisé via la console, pas via un fichier `CNAME` versionné.

## Workflow CI/CD

`.github/workflows/ci.yml` construit et teste sur chaque push/PR vers `main`, et déploie
uniquement sur push vers `main` :

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
      - run: npm run test:ng
      - run: npm run validate:quotes
      - run: npm run build

      - name: Deployer sur Firebase Hosting
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: lets-b6c11
```

Le job `pull_request` profite du même socle tests/build/`validate:quotes` comme filet avant fusion,
sans l'étape de déploiement (limitée par la condition `if` à un push sur `main`).

## Vérification locale

```bash
npm run build
npx firebase emulators:start --only hosting   # http://127.0.0.1:5000 par défaut
curl -s http://127.0.0.1:5000/cryptogramme | grep -o '<title>[^<]*</title>'   # confirme le fallback SPA
```

Si le CLI réclame une connexion, lancer `npx firebase login` une fois sur la machine.

## Configuration manuelle (console Firebase / OVH — pas automatisable)

1. **Projet Firebase** : console Firebase → « Ajouter un projet » → nommer (ex. `lets-ple`).
2. **Firestore** (squelette) : Build → Firestore Database → Créer, mode Production, région
   `europe-west9` (Paris, définitif).
3. **Authentication** (squelette) : Build → Authentication → Commencer, **ne configurer aucun
   fournisseur**.
4. **Hosting + domaine personnalisé** : Build → Hosting → Commencer, puis onglet Hosting → Ajouter
   un domaine personnalisé → `lets-ple.lets-code.fr`. Firebase propose le **flux CNAME simplifié** :
   un seul enregistrement CNAME fait à la fois la preuve de propriété et le routage. Vérifier le
   type exact affiché à l'écran avant de le saisir côté DNS — un mauvais type (TXT au lieu de CNAME)
   bloque la détection indéfiniment, même après le délai de 24h annoncé par Firebase.
5. **DNS chez OVH** : Web Cloud → Domaines → `lets-code.fr` → Zone DNS → Ajouter une entrée → type
   **CNAME** → sous-domaine `lets-ple` → coller la valeur donnée par Firebase. Propagation
   généralement rapide (TTL observé : 5 min). Revenir sur l'écran Firebase et cliquer « Vérifier ».
6. **Compte de service pour le déploiement automatique** : Paramètres du projet → Comptes de
   service → Générer une nouvelle clé privée (ne jamais committer ce fichier JSON) → coller son
   contenu dans un secret GitHub (`Settings → Secrets and variables → Actions`), nommé
   `FIREBASE_SERVICE_ACCOUNT`.

## Vérification de bout en bout

1. Onglet Actions du dépôt GitHub : le job `build` passe au vert, y compris le déploiement.
2. `https://lets-ple.lets-code.fr` sert le portail avec certificat TLS valide.
3. Une route profonde (`/cryptogramme`) rechargée directement fonctionne, pas de 404.

**Rappel** : ce déploiement n'est pas diffusé publiquement (pas de lien partagé, pas d'annonce) —
voir l'AVERTISSEMENT en tête de `CLAUDE.md`, qui reste valable pour toute diffusion future du lien.
