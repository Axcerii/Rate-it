# Cahier des Charges & Architecture - "Rate It"

## 1. Présentation du Projet
**Nom de code :** Rate It
**Concept :** Un jeu interactif (type "Party Game" à la Kahoot) permettant à des spectateurs ou amis de noter des vidéos YouTube (principalement des génériques d'Anime/Manga) sur une échelle de 1 à 5.
**Plateformes :** 
- Un écran Hôte (PC/TV) qui diffuse la vidéo et le classement final.
- Des écrans Joueurs (Smartphones via QR Code) servant de "télécommandes" pour voter.

## 2. Fonctionnalités Requises
### Core (Cœur de l'application)
- **Hôte :** Création d'une session, génération du QR Code, lecteur YouTube Iframe intégré (autoplay, passage à la vidéo suivante).
- **Joueur :** Rejoindre via QR Code (ou code court), interface de vote (1 à 5) en temps réel, historique personnel de ses votes.
- **Temps Réel :** Synchronisation millimétrée entre l'hôte et les joueurs via WebSockets.
- **Classement :** Affichage de fin de partie avec un classement allant de la pire note à la meilleure.

### Fonctionnalités Avancées
- **Navigation Hôte :** Possibilité de revenir en arrière sur les vidéos précédentes.
- **Gestion de contenu :** 
  - Proposer des listes préfaites.
  - Création de listes personnalisées (depuis zéro ou basées sur l'existant).
- **Statistiques :** Visualisation des moyennes globales sur les listes préfaites.
- **Résilience (Crash & Déconnexion) :** 
  - Restauration de session en cas de crash du serveur Hôte.
  - Reconnexion d'un joueur avec restauration de ses notes via Local Storage (identifiant de session).
- **Intégrations Tiers :**
  - **MyAnimeList (MAL) :** Connexion au compte MAL pour générer des quiz sur la base des animes visionnés.
  - **Twitch :** Connexion du chat de l'hôte pour comptabiliser les votes des viewers en temps réel.
- **Mode Privé :** Possibilité de cacher/masquer le QR Code de l'écran principal pour éviter les intrusions.

## 3. Architecture Technique (Stack)
- **Frontend (Hôte & Joueur) :** Next.js (React), Tailwind CSS.
- **Backend (Moteur Temps Réel) :** Node.js avec Socket.io & Express.
- **Cache / État en mémoire :** Redis (Indispensable pour la résilience et les reconnexions rapides).
- **Base de Données (Stockage Froid) :** PostgreSQL (Sauvegarde des listes, comptes et statistiques globales).

## 4. Structure du Monorepo pour l'IDE (Antigravity)
```text
rate-it/
├── backend/                  # Serveur Node.js (Socket.io)
│   ├── src/
│   │   ├── sockets/          # Logique des événements (join, vote, next_video)
│   │   ├── services/         # Intégrations (YouTube API, MAL API, Twitch EventSub)
│   │   ├── store/            # Connexion Redis (sauvegarde de l'état des sessions)
│   │   ├── db/               # Connexion PostgreSQL
│   │   └── server.js         # Point d'entrée
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                 # Application Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── host/         # Vue Hôte (Lecteur YT, QR Code, Leaderboard)
│   │   │   ├── play/         # Vue Joueur Mobile (Boutons de vote)
│   │   │   └── page.tsx      # Landing page (Créer/Rejoindre)
│   │   ├── components/       # UI partagée
│   │   └── lib/              # Hooks (useSocket, useTwitch, useMAL)
│   ├── Dockerfile
│   └── package.json
│
├── shared/                   # Types et constantes partagés
│   └── types.ts              
│
└── docker-compose.yml        # Orchestration pour le déploiement VPS
```

## 5. Directives de Développement (Roadmap)
1. **Étape 1 :** Initialiser le Monorepo et les connexions aux bases (Redis & Postgres).
2. **Étape 2 :** Créer le tunnel WebSocket basique (Création de salle, Connexion joueur).
3. **Étape 3 :** Intégrer l'Iframe YouTube sur la vue Hôte et synchroniser l'état de lecture avec le Backend.
4. **Étape 4 :** Développer l'interface de vote mobile et gérer l'accumulation des scores dans Redis.
5. **Étape 5 :** Implémenter le système de résilience (Local Storage + vérification d'état Redis à la reconexion).
6. **Étape 6 :** Ajouter les intégrations externes (Twitch & MyAnimeList).
