# Hébergement — migration vers Firebase

## Contexte

La tâche 18 du plan v1 (`docs/superpowers/plans/2026-07-28-lets-ple-v1.md`) prévoyait un
déploiement GitHub Pages sur un sous-domaine `letsple.<utilisateur>.github.io`. Ce document la
remplace : le déploiement cible désormais **Firebase Hosting**, sur `lets-ple.lets-code.fr`
(domaine OVH déjà possédé par l'utilisateur), avec un projet Firebase dont le squelette (Auth,
Firestore) est provisionné dès maintenant plutôt qu'au moment où ces fonctionnalités seront
construites.

**Ce déploiement n'est pas diffusé publiquement** (pas de lien partagé, pas d'annonce) — décision
explicite de l'utilisateur qui accepte, pour l'instant, de ne pas tenir compte de l'avertissement
sur le droit d'auteur du corpus documenté en tête de `CLAUDE.md`. Ce document ne lève pas cet
avertissement ; il reste valable pour toute diffusion future du lien.

## Décision et alternatives considérées

| Option | Pour | Contre |
|---|---|---|
| **GitHub Pages** | Déjà câblé dans le plan v1 ; zéro compte supplémentaire ; statique pur, gratuit sans limite pratique | Aucun backend : le jour où comptes/scores/notifications/paiement arrivent, il faudra de toute façon adosser un service tiers (probablement Firebase) — double infrastructure à gérer, deux pipelines de déploiement |
| **Firebase Hosting** (retenu) | Même écosystème pour l'hébergement statique d'aujourd'hui et Auth/Firestore/Functions/FCM/paiement (via Stripe + Cloud Functions) de demain ; un seul projet, un seul CLI, une seule facturation à terme ; certificat TLS et domaine personnalisé gérés automatiquement | Compte Google Cloud à créer et maintenir ; CLI supplémentaire (`firebase-tools`) en plus de GitHub Actions ; `ci.yml` de la tâche 18 doit être réécrit pour cette cible |
| Cloudflare Pages + Workers | Aussi généraliste, très bon niveau gratuit | Écosystème plus éclaté pour auth/paiement (pas d'équivalent direct à Firebase Auth/Firestore packagé) ; pas de raison de le préférer vu la décision déjà prise pour Firebase |

**Retenu : Firebase**, confirmé par l'utilisateur — la trajectoire produit (comptes individuels et
d'équipe, scores, notifications, paiement) rend la cohérence d'écosystème plus importante que la
simplicité immédiate de GitHub Pages.

## Architecture cible

```
Projet Firebase "lets-ple"
├─ Hosting          sert dist/portal (build Angular existant) — seule pièce utilisée aujourd'hui
├─ Authentication    service activé, AUCUN fournisseur configuré (choix différé)
└─ Firestore         base créée, région europe-west9 (Paris), mode production, AUCUNE collection

Domaine : lets-ple.lets-code.fr → Firebase Hosting (TXT de vérification + A/AAAA fournis par Firebase)
DNS : géré chez OVH, zone DNS de lets-code.fr
CI/CD : GitHub Actions, déploiement via un compte de service Firebase (secret GitHub)
```

- **Région Firestore = `europe-west9` (Paris)**, choix irréversible sans recréer la base : décidé
  maintenant pour ne pas avoir à y revenir. Mono-région (pas `eur3` multi-région) — latence minimale
  pour un public francophone, au prix d'une résilience légèrement moindre, jugée suffisante pour un
  projet de cette taille.
- **Auth et Firestore restent vides.** Aucun fournisseur de connexion, aucune collection, aucune
  règle de sécurité au-delà des règles par défaut (accès refusé) tant qu'aucune fonctionnalité ne
  les consomme. Chaque usage réel (comptes, scores, progression d'équipe) mérite son propre
  brainstorming le moment venu — notamment pour les règles de sécurité Firestore, qui ne se
  décident pas dans l'abstrait.
- **Hors scope de ce document** : Cloud Functions, Firebase Cloud Messaging (notifications),
  intégration de paiement (Stripe ou autre). Rien n'est provisionné pour eux ; ils n'ont pas de
  date.

## Ce qui change dans le dépôt

Détaillé dans le plan d'implémentation à venir (`writing-plans`), mais à titre de repère :

- `firebase.json` et `.firebaserc` (nouveaux) — configuration Hosting, `public` pointant vers le
  dossier de build du portail, réécriture SPA (`rewrites` vers `index.html`).
- `.github/workflows/ci.yml` — l'étape de déploiement remplace `actions/deploy-pages` par
  `FirebaseExtended/action-hosting-deploy` (ou `firebase deploy --only hosting` avec un compte de
  service), après le même socle de build/tests/`validate:quotes` déjà prévu par la tâche 18.
- `public/404.html`, `public/.nojekyll`, `public/CNAME` (spécifiques à GitHub Pages) — supprimés ;
  Firebase Hosting gère nativement le fallback SPA via `firebase.json` et le domaine personnalisé
  via la console, pas via un fichier `CNAME` versionné.
- Tâche 18 du plan v1 — à réécrire pour refléter Firebase au lieu de GitHub Pages.

## Vérification / critères de succès

- `https://lets-ple.lets-code.fr` sert le portail avec certificat TLS valide (cadenas vert).
- Le routage Angular fonctionne sur rechargement d'une route profonde (ex. `/cryptogramme` rechargé
  directement ne renvoie pas une 404).
- `firebase deploy` déclenché depuis GitHub Actions sur push vers `main` réussit sans intervention
  manuelle.
- La console Firebase confirme : Hosting actif avec le domaine personnalisé vérifié, Firestore créée
  en `europe-west9` sans collection, Authentication activée sans fournisseur.

---

## Guide des actions manuelles

Tout ce qui suit **ne peut être fait que par toi** : accès à ton compte Google, au manager OVH, et
aux secrets du dépôt GitHub. Je détaillerai les commandes CLI exactes (`firebase init`, contenu de
`firebase.json`, workflow YAML complet) dans le plan d'implémentation ; ce guide couvre uniquement
les clics et saisies côté consoles web.

### A. Créer le projet Firebase

1. Aller sur https://console.firebase.google.com (connecté avec le compte Google que tu veux
   associer au projet).
2. « Ajouter un projet » → nom **`lets-ple`** (ou un nom de ton choix, l'ID généré n'a pas besoin de
   correspondre exactement au dépôt).
3. Google Analytics : pas nécessaire pour l'instant, tu peux désactiver.
4. Créer le projet, attendre son provisionnement.

### B. Activer Firestore (squelette)

1. Dans la console du projet → menu **Build → Firestore Database** → « Créer une base de données ».
2. Mode : **Production** (règles fermées par défaut — rien n'est exposé tant qu'aucune règle n'est
   écrite).
3. Emplacement : **`europe-west9` (Paris)**. Confirme bien ce choix, il est définitif.
4. Ne rien créer d'autre : pas de collection, pas de document. Laisser la base vide.

### C. Activer Authentication (squelette)

1. Menu **Build → Authentication** → « Commencer ».
2. Onglet « Sign-in method » : **ne configurer aucun fournisseur**. Le service est activé, prêt à
   accueillir un fournisseur (email/mot de passe, Google…) le jour où la fonctionnalité comptes sera
   conçue.

### D. Activer Hosting et ajouter le domaine personnalisé

1. Menu **Build → Hosting** → « Commencer ». Tu peux ignorer les commandes CLI proposées ici — elles
   seront exécutées ensemble au moment de l'implémentation.
2. Une fois Hosting activé, dans l'onglet Hosting → « Ajouter un domaine personnalisé ».
3. Saisir **`lets-ple.lets-code.fr`** → Continuer.
4. Pour un sous-domaine, Firebase propose désormais le **flux CNAME simplifié** : un seul
   enregistrement **CNAME** (nom + valeur, ex. `<project-id>.web.app`) fait à la fois la preuve de
   propriété et le routage — pas de TXT ni de A/AAAA séparés. Note la valeur affichée, direction
   OVH (étape E). **Attention au type exact affiché à l'écran** (une colonne « Type » à côté de
   l'enregistrement) — vérifié une fois avec le mauvais type (TXT au lieu de CNAME) saisi dans OVH
   par erreur, ce qui bloque la détection indéfiniment sans jamais se résoudre tout seul, même après
   le délai de 24h annoncé par Firebase.
5. Reviens sur cet écran Firebase après avoir ajouté le CNAME chez OVH (étape E) et clique
   « Vérifier ». Ça peut échouer les premières minutes le temps que le DNS se propage — réessaie.
6. Une fois vérifié, Firebase provisionne automatiquement le certificat TLS (généralement quelques
   minutes à quelques heures, rarement jusqu'à 24h). Le statut passe à « Connecté » dans la console.
   Aucune étape A/AAAA supplémentaire n'est nécessaire avec le flux CNAME.

### E. Configurer la zone DNS chez OVH

1. Aller sur https://www.ovh.com/manager/ → **Web Cloud → Domaines → `lets-code.fr` → Zone DNS**.
2. « Ajouter une entrée » → type **CNAME** (pas TXT — vérifier le type exact affiché par Firebase à
   l'étape D.4) → sous-domaine **`lets-ple`** → coller la valeur donnée par Firebase → valider.
3. Attendre la vérification côté Firebase (étape D.5). Propagation généralement rapide chez OVH (TTL
   par défaut observé : 5 min).
4. Rien d'autre à ajouter : le flux CNAME couvre à la fois la vérification et le routage, pas de A
   ni de AAAA séparés à créer.

### F. Créer un compte de service pour le déploiement automatique

Nécessaire pour que GitHub Actions puisse déployer sans que tu lances `firebase deploy` à la main à
chaque fois.

1. Console Firebase → ⚙️ **Paramètres du projet → Comptes de service**.
2. « Générer une nouvelle clé privée » → confirme → un fichier `.json` se télécharge. **Ne jamais
   committer ce fichier.**
3. Sur GitHub : dépôt `lets-ple` → **Settings → Secrets and variables → Actions → New repository
   secret**.
4. Nom du secret : `FIREBASE_SERVICE_ACCOUNT` (le nom exact sera confirmé dans le plan
   d'implémentation selon l'action GitHub utilisée). Valeur : coller **tout le contenu** du fichier
   `.json` téléchargé.
5. Supprimer le fichier `.json` local une fois le secret enregistré (ou le garder hors du dépôt,
   dans un gestionnaire de mots de passe).

### G. Récapitulatif des valeurs à avoir sous la main

À la fin de ce guide, tu dois avoir :
- Un projet Firebase nommé (ex. `lets-ple`), avec Hosting, Auth (vide) et Firestore (vide,
  `europe-west9`) activés.
- Le domaine `lets-ple.lets-code.fr` en statut « Connecté » dans Firebase Hosting.
- Un secret GitHub Actions contenant le compte de service JSON.

Ces trois éléments suffisent pour que je câble le `firebase.json` et le workflow CI dans le plan
d'implémentation, sans autre action manuelle de ta part.
