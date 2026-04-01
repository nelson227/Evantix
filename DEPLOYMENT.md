# Evantix — Guide de Déploiement

## Architecture de production

```
┌──────────────┐     HTTPS     ┌──────────────────┐     TCP      ┌──────────────┐
│   Vercel     │ ──────────→   │   Railway (API)  │ ──────────→  │  Railway     │
│   Next.js    │               │   NestJS         │              │  PostgreSQL  │
│   Frontend   │               │   Port $PORT     │              │  Port 5432   │
└──────────────┘               └──────────────────┘              └──────────────┘
                                        │
                                        ↓
                               ┌──────────────────┐
                               │   Railway Redis  │
                               │   (optionnel)    │
                               └──────────────────┘
```

---

## 1. PostgreSQL sur Railway

1. Aller sur [railway.app](https://railway.app) → **New Project**
2. Cliquer **+ New** → **Database** → **PostgreSQL**
3. Railway fournit automatiquement `DATABASE_URL` — copier cette valeur

---

## 2. Backend (NestJS) sur Railway

### 2.1 Déployer

1. Dans le même projet Railway → **+ New** → **GitHub Repo** → sélectionner `evantix`
2. Railway détecte le `Dockerfile` via `railway.toml`
3. Le build se lance automatiquement

### 2.2 Variables d'environnement (Railway Settings > Variables)

| Variable | Valeur | Notes |
|----------|--------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Référence auto au plugin Postgres |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Si vous ajoutez un plugin Redis |
| `JWT_ACCESS_SECRET` | `<générer 64 chars aléatoires>` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `<générer 64 chars aléatoires>` | `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRATION` | `15m` | |
| `JWT_REFRESH_EXPIRATION` | `7d` | |
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | Railway injecte aussi `$PORT` |
| `CORS_ORIGIN` | `https://evantix.vercel.app` | Votre domaine Vercel |

### 2.3 Vérifier le déploiement

```bash
curl https://your-api.up.railway.app/api/v1/health
# → {"status":"ok","timestamp":"2026-..."}
```

### 2.4 Volume pour les uploads (optionnel)

Railway supporte les volumes persistants :
1. Service API → **Settings** → **Volumes**
2. Mount path: `/app/apps/api/uploads`
3. Les fichiers uploadés survivent aux redéploiements

> **Note** : Pour la production à grande échelle, migrer vers S3/R2 est recommandé.

---

## 3. Frontend (Next.js) sur Vercel

### 3.1 Déployer

1. Aller sur [vercel.com](https://vercel.com) → **New Project**
2. Importer le repo `evantix` depuis GitHub
3. Vercel détecte automatiquement le `vercel.json`
4. **Framework Preset** : Next.js
5. **Root Directory** : `.` (racine, le vercel.json gère le reste)

### 3.2 Variables d'environnement (Vercel Settings > Environment Variables)

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `NEXT_PUBLIC_API_URL` | `https://your-api.up.railway.app/api/v1` | Production |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | Development |

### 3.3 Domaine personnalisé (optionnel)

1. Vercel Dashboard → **Settings** → **Domains**
2. Ajouter votre domaine
3. Mettre à jour `CORS_ORIGIN` côté Railway pour inclure le nouveau domaine

---

## 4. Commandes utiles

### Migrations Prisma en production
```bash
# Se fait automatiquement au démarrage (CMD dans Dockerfile)
# Pour forcer manuellement via Railway CLI :
railway run "cd apps/api && npx prisma migrate deploy"
```

### Seed en production (première fois)
```bash
railway run "cd apps/api && npx prisma db seed"
```

### Logs
```bash
# Railway
railway logs

# Vercel
vercel logs https://evantix.vercel.app
```

---

## 5. Checklist pré-déploiement

- [ ] PostgreSQL créé sur Railway
- [ ] Variables d'environnement configurées sur Railway
- [ ] `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` sont des valeurs fortes et uniques
- [ ] `CORS_ORIGIN` contient le domaine Vercel exact
- [ ] `NEXT_PUBLIC_API_URL` pointe vers l'URL Railway avec `/api/v1`
- [ ] Les migrations Prisma sont à jour (`prisma migrate deploy`)
- [ ] Le health check répond : `GET /api/v1/health`
- [ ] Le frontend charge et peut se connecter à l'API

---

## 6. Sécurité production

- Ne jamais committer les fichiers `.env` (déjà dans `.gitignore`)
- Utiliser des secrets Railway/Vercel uniquement
- `NODE_ENV=production` active Helmet + rate limiting
- Les JWT secrets doivent être ≥ 32 caractères aléatoires
- CORS restreint au domaine Vercel uniquement
