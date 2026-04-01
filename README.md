# Evantix - Plateforme de Suivi d'Évangélisation

Application web et mobile pour le suivi des activités d'évangélisation, la gestion des publications, des objectifs et la collaboration entre membres.

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend API | NestJS 10 + Prisma 5 + PostgreSQL 16 |
| Web Frontend | Next.js 14 (App Router) + Tailwind CSS 3 |
| Mobile | React Native 0.76 + Expo 52 |
| Temps réel | Socket.IO |
| Cache/Queue | Redis 7 + BullMQ |
| Monorepo | npm workspaces |

## Prérequis

- **Node.js** >= 20
- **npm** >= 10
- **Docker Desktop** (pour PostgreSQL + Redis)

## Installation rapide

```bash
# 1. Cloner et installer les dépendances
git clone <repo-url> evantix
cd evantix
npm install

# 2. Générer le client Prisma
npx prisma generate --schema=apps/api/prisma/schema.prisma

# 3. Démarrer PostgreSQL et Redis
docker compose up -d

# 4. Exécuter la migration de la base de données
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma --name init

# 5. Démarrer l'API (port 3001)
npm run dev:api

# 6. Dans un autre terminal, démarrer le web (port 3000)
npm run dev:web

# 7. Pour le mobile (optionnel)
npm run dev:mobile
```

## Structure du projet

```
evantix/
├── apps/
│   ├── api/          # Backend NestJS
│   │   ├── src/
│   │   │   ├── auth/          # Authentification JWT
│   │   │   ├── users/         # Gestion utilisateurs
│   │   │   ├── publications/  # Publications d'évangélisation
│   │   │   ├── goals/         # Objectifs personnels
│   │   │   ├── dashboard/     # Tableau de bord & analytics
│   │   │   ├── chat/          # Messagerie temps réel
│   │   │   ├── notifications/ # Notifications
│   │   │   └── admin/         # Administration & modération
│   │   └── prisma/            # Schéma et migrations
│   ├── web/          # Frontend Next.js
│   │   └── src/app/           # Pages App Router
│   └── mobile/       # App mobile Expo/React Native
│       └── app/               # Écrans Expo Router
└── packages/
    └── types/        # Types TypeScript partagés
```

## URLs en développement

| Service | URL |
|---------|-----|
| API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |
| Web App | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Scripts disponibles

```bash
npm run dev:api      # Démarrer l'API en mode watch
npm run dev:web      # Démarrer le frontend web
npm run dev:mobile   # Démarrer l'app mobile Expo
npm run build:api    # Build production API
npm run build:web    # Build production Web
npm run lint         # Linter tous les workspaces
npm run format       # Formater le code (Prettier)
```

## Variables d'environnement

### API (`apps/api/.env`)
```env
DATABASE_URL="postgresql://evantix:evantix_dev_pwd@localhost:5432/evantix?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="votre_secret_jwt_32chars_minimum"
JWT_REFRESH_SECRET="votre_secret_refresh_token"
PORT=3001
NODE_ENV=development
```

### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## Fonctionnalités

- **Authentification** : Inscription/Connexion avec JWT + refresh tokens
- **Publications** : Créer, modifier, supprimer des rapports d'activité
- **Objectifs** : Définir et suivre des objectifs personnels
- **Dashboard** : Analytiques et statistiques visuelles
- **Chat** : Messagerie en temps réel (Socket.IO)
- **Notifications** : Alertes push et in-app
- **Administration** : Modération et gestion des utilisateurs

## Note importante

> **Performance locale** : Pour de meilleures performances d'installation (`npm install`) et de build, il est recommandé de ne **pas** placer le projet dans un dossier synchronisé par OneDrive/Dropbox. Préférez un chemin local comme `C:\Dev\evantix`.
