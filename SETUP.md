# SuperMart — Developer Guide

> Stack: Node/Express · Prisma · MySQL · React/Vite · pnpm workspaces

---

## Project Structure

```
gramathaankadai-supermart-app/
├── client/               React/Vite frontend
├── server/               Express API
│   ├── prisma/
│   │   ├── schema.prisma         DB schema
│   │   └── migrations/           Prisma migration files
│   └── src/
│       ├── index.js              Entry point
│       ├── db.js                 Prisma client
│       ├── middleware/
│       └── routes/
├── db/
│   └── seed/
│       └── seed_gramathaankadai.sql   Default tenant + admin
├── Dockerfile.app                Railway API service
├── Dockerfile.seed               One-time DB seed job
├── netlify.toml                  Netlify build config
└── railway.json                  Railway deploy config
```

---

## Local Development

### Prerequisites
- Node.js 22+
- pnpm (`npm install -g pnpm`)
- Docker Desktop

### Option A — Docker MySQL (recommended)

```bash
# 1. Clone and install
git clone <repo-url>
cd gramathaankadai-supermart-app
pnpm install

# 2. Copy env file
cp server/.env.example server/.env
# DATABASE_URL is already set for Docker — no change needed

# 3. Start MySQL
docker compose up -d mysql

# 4. Run migrations
cd server && npx prisma migrate dev && cd ..

# 5. Seed (first time only)
docker compose exec -T mysql mysql -uroot -proot gramathaankadai_db < db/seed/seed_gramathaankadai.sql

# 6. Start dev servers
pnpm dev
```

**server/.env**
```
DATABASE_URL=mysql://root:root@localhost:3307/gramathaankadai_db
PORT=3001
```

---

### Option B — Local MySQL (installed on machine)

**Prerequisites:** MySQL 8.x installed and running on port 3306.

```bash
# 1. Clone and install
git clone <repo-url>
cd gramathaankadai-supermart-app
pnpm install

# 2. Create the database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS gramathaankadai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Copy and edit env file
cp server/.env.example server/.env
```

Edit `server/.env` — change the port from 3307 to 3306:
```
DATABASE_URL=mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/gramathaankadai_db
PORT=3001
```

```bash
# 4. Run migrations
cd server && npx prisma migrate dev && cd ..

# 5. Seed (first time only)
mysql -u root -p gramathaankadai_db < db/seed/seed_gramathaankadai.sql

# 6. Start dev servers
pnpm dev
```

> If your local MySQL has no root password, use `mysql://root@localhost:3306/gramathaankadai_db`

**client/.env** (already set for local dev)
```
VITE_API_URL=http://localhost:3001/api
```

App runs at:
- Frontend: http://localhost:5173
- API: http://localhost:3001

Default login: `admin@gramathaankadai.com` / `1234`

---

## Adding a New Feature

### 1. Backend — new route

Create `server/src/routes/myfeature.js`:
```js
import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const data = await prisma.myModel.findMany({ where: { tenantId: req.tenantId } });
  res.json(data);
});

export default router;
```

Register in `server/src/index.js`:
```js
import myFeatureRouter from './routes/myfeature.js';
app.use('/api/myfeature', myFeatureRouter);
```

### 2. Backend — new DB table (migration)

Update `server/prisma/schema.prisma` with the new model:
```prisma
model MyModel {
  id       Int    @id @default(autoincrement())
  tenantId Int
  name     String
  tenant   Tenant @relation(fields: [tenantId], references: [id])
}
```

Generate and apply the migration locally:
```bash
cd server
npx prisma migrate dev --name add_my_model
```

This creates `server/prisma/migrations/<timestamp>_add_my_model/migration.sql` automatically.

### 3. Frontend — new API service

Create `client/src/features/myfeature/resources/myfeature-service.js`:
```js
import api from '@lib/api';

export const MyFeatureAPI = {
  getAll:  ()     => api.get('/myfeature'),
  create:  (data) => api.post('/myfeature', data),
  update:  (id, data) => api.patch(`/myfeature/${id}`, data),
  delete:  (id)   => api.delete(`/myfeature/${id}`),
};
```

### 4. Add route in App.jsx
```jsx
const MyFeature = lazy(() => import('@features/myfeature/components/Index.jsx'));

// Inside <Routes>:
<Route path="myfeature" element={<MyFeature />} />
```

---

## Database Migrations

### Workflow

| Environment | Command | When |
|-------------|---------|------|
| Local dev   | `npx prisma migrate dev --name description` | After changing schema.prisma |
| Production  | Automatic — runs on every Railway deploy | On git push |

### Rules
- **Never** run `prisma migrate dev` against the production database
- **Never** manually edit files inside `server/prisma/migrations/`
- Always commit the generated migration file before pushing

### Check migration status locally
```bash
cd server
npx prisma migrate status
```

---

## Deployment

### Architecture

| Service | Platform | Config |
|---------|----------|--------|
| MySQL   | Railway (plugin) | Auto-provisioned |
| API     | Railway | `Dockerfile.app` |
| Client  | Netlify | `netlify.toml` |

### Railway — API Service

**Environment variables to set:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` |
| `NODE_ENV` | `production` |

**Pre-deploy command** (set in Railway UI → Service → Settings → Deploy):
```
node_modules/.bin/prisma migrate deploy
```

This runs automatically before each deploy — applies any pending migrations, skips already-applied ones. Safe to run repeatedly.

### Netlify — Frontend

**Environment variables to set in Netlify UI:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-app.up.railway.app/api` |

Build settings are in `netlify.toml` — no manual config needed.

### Deploy flow

```
git push origin main
    │
    ├── Railway detects push
    │     ├── Builds Docker image (Dockerfile.app)
    │     ├── Runs: prisma migrate deploy   ← pre-deploy
    │     └── Starts: node src/index.js
    │
    └── Netlify detects push
          ├── pnpm install (workspace)
          ├── pnpm --filter client build
          └── Deploys client/dist/
```

### Seed (one-time, first deploy only)

Railway → **+ New service** → GitHub repo → Dockerfile: `Dockerfile.seed`

Set variables:
```
MYSQLHOST=${{MySQL.MYSQLHOST}}
MYSQLPORT=${{MySQL.MYSQLPORT}}
MYSQLUSER=${{MySQL.MYSQLUSER}}
MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}
```

Deploy once → see `Seed complete.` in logs → delete the service.

---

## Useful Commands

```bash
# Install all packages
pnpm install

# Run dev (both client + server)
pnpm dev

# Build client
pnpm build

# Prisma studio (DB GUI)
cd server && npx prisma studio

# Reset local DB (wipe + migrate + seed)
pnpm db:reset

# Start only MySQL
docker compose up -d mysql

# Stop MySQL
docker compose down
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL not found` | Check `server/.env` exists and has correct value |
| API calls fail locally | Make sure `docker compose up -d mysql` is running and `pnpm dev` is started |
| Migration fails | Run `npx prisma migrate status` to see which migration is broken |
| Netlify build fails | Check `VITE_API_URL` is set in Netlify UI and is the Railway URL ending in `/api` |
| Railway deploy fails | Check `DATABASE_URL` is set to `${{MySQL.MYSQL_URL}}` in Railway service variables |
| Login "invalid credentials" | DB not seeded — run the seed service on Railway |
