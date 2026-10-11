# Rate It

Jeu de notation musicale en direct : un hôte diffuse des vidéos YouTube (génériques d'animés, musiques de films, etc.) et les joueurs les notent de 1 à 5 depuis leur téléphone. Le chat Twitch de l'hôte peut voter aussi. À la fin, un classement et une image de résultats à partager.

Site : [rate-it.fr](https://rate-it.fr)

## Fonctionnalités

- Salles avec code à 6 caractères, lien d'invitation et QR code
- Vote en temps réel, résultats par vidéo puis classement final animé
- Playlists validées et playlists de la communauté, avec lien partageable qui ouvre une salle prête à jouer
- Import des animés terminés depuis MyAnimeList ou AniList
- Votes du chat Twitch, avec un test de connexion dans le lobby
- Image de résultats à télécharger ou partager
- Page d'administration pour valider et gérer les playlists

## Structure

```
backend/    Serveur Node.js (Express + Socket.io), PostgreSQL et Redis
frontend/   Application Next.js (React, Tailwind CSS)
shared/     Types TypeScript partagés
caddy/      Bloc de configuration du reverse proxy de production
scripts/    Sauvegarde de la base de données
```

## Lancer le projet en local

Prérequis : Node.js 20+ et Docker.

1. Créer un fichier `.env` à la racine à partir de `.env.production.example`, avec les valeurs de développement (`DATABASE_URL`, `REDIS_URL`, `ADMIN_PASSWORD`...).
2. Démarrer PostgreSQL et Redis :
   ```bash
   docker compose up -d
   ```
3. Démarrer le backend (port 4000) :
   ```bash
   cd backend && npm install && npm run dev
   ```
4. Démarrer le frontend (port 3000) :
   ```bash
   cd frontend && npm install && npm run dev
   ```

Le site est alors disponible sur http://localhost:3000. Le schéma de la base est créé au premier démarrage du backend.

## Tests

```bash
cd backend && npm test
```

Les tests tournent sans base de données ni réseau.

## Production

Le déploiement se fait avec `docker-compose.prod.yml`, derrière un reverse proxy Caddy (voir `caddy/Caddyfile`).

1. Copier `.env.production.example` en `.env` sur le serveur et remplir les valeurs.
2. Construire et démarrer :
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

Les variables `NEXT_PUBLIC_*` sont lues à la construction du frontend : il faut reconstruire l'image après les avoir modifiées.

## Personnalisation

- Textes de la page des joueurs (libellés des notes, réactions) : `frontend/src/content/playTexts.ts`
- Icônes dessinées à la main : `frontend/public/Icons/`, branchées dans `frontend/src/components/icons.tsx`
- E-mail et compte Twitter de contact : variables `NEXT_PUBLIC_CONTACT_EMAIL` et `NEXT_PUBLIC_TWITTER_HANDLE`
