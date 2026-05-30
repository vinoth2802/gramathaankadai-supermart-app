# Deployment Guide

> **Stack:** Node/Express API → Railway | React/Vite client → Netlify | MySQL → Railway
>
> **Migration strategy:** `prisma migrate deploy` runs automatically as a Railway
> pre-deploy command before every release — no separate migration service needed.

---

## Part 1 — Railway (API + Database)

### Step 1 — Create project

1. [railway.app](https://railway.app) → **New Project** → **Empty Project**

---

### Step 2 — Add MySQL

1. **+ New** → **Database** → **Add MySQL**
2. Railway provisions the DB and exposes these variables automatically:
   `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQL_URL`
3. Click the MySQL service → **Variables** tab — keep this open, you'll copy values from here.

---

### Step 3 — Deploy the API

1. **+ New** → **GitHub Repo** → select your repo
2. Railway detects `railway.json` and uses `Dockerfile.app` automatically
3. Go to **Variables** tab → add:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | *(paste the `MYSQL_URL` value from the MySQL service)* |
   | `NODE_ENV` | `production` |

   > Do **not** set `PORT` — Railway injects it automatically.

4. Click **Deploy**

   On every deploy Railway automatically runs **before** starting the server:
   ```
   prisma migrate deploy
   ```
   This applies any pending migrations. It is safe to run repeatedly — already-applied migrations are skipped.

5. **Settings** → **Networking** → **Generate Domain**
6. Copy the public URL → `https://your-app.railway.app`
   **You need this for Netlify.**

---

### Step 4 — Seed the database (one-time only)

Run this **once** after the first successful deploy to insert the default tenant and admin user.

1. **+ New** → **GitHub Repo** → same repo
2. **Settings** → **Builder** → set Dockerfile path to:
   ```
   Dockerfile.seed
   ```
3. **Variables** tab → add:

   | Variable | Value |
   |----------|-------|
   | `MYSQLHOST` | *(from MySQL service)* |
   | `MYSQLPORT` | *(from MySQL service)* |
   | `MYSQLUSER` | *(from MySQL service)* |
   | `MYSQLPASSWORD` | *(from MySQL service)* |
   | `MYSQLDATABASE` | *(from MySQL service)* |

4. **Deploy** → wait for green ✓
5. **Delete this service** — it is a one-time job, not needed again.

---

## Part 2 — Netlify (React Client)

### Step 1 — Connect repo

1. [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project** → **GitHub**
2. Select your repo — Netlify reads `netlify.toml` automatically

   | Setting | Value (auto-detected) |
   |---------|-----------------------|
   | Base directory | `client` |
   | Build command | `npm install && npm run build` |
   | Publish directory | `dist` |

### Step 2 — Set environment variable

**Site configuration** → **Environment variables** → **Add variable**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-app.railway.app/api` |

> Use the Railway domain from Part 1 Step 5. The `/api` suffix is required.

### Step 3 — Deploy

Click **Deploy site** — done.

---

## Summary of what runs when

| When | What runs | Where |
|------|-----------|-------|
| Every deploy | `prisma migrate deploy` | Railway pre-deploy command |
| First setup only | `Dockerfile.seed` | Railway one-time job |
| Every deploy | `node src/index.js` | Railway API service |
| Every push to main | `npm run build` | Netlify |

---

## Test after deployment

```
# API health check
https://your-app.railway.app/api/health
→ {"status":"ok"}

# Client
https://your-site.netlify.app
→ Login page appears
```

Default login (from seed):
- **Email:** `admin@gramathaankadai.com`
- **Password:** `1234`

> Change the password immediately after first login.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 502/503 | Railway logs → likely `DATABASE_URL` wrong or DB not reachable |
| `prisma migrate deploy` fails | Check `DATABASE_URL` format: `mysql://user:pass@host:port/db` |
| Client shows blank page | Browser console → `VITE_API_URL` missing or wrong |
| Login "Cannot connect to server" | `VITE_API_URL` missing `/api` at the end |
| Seed fails | Make sure API deployed successfully first (tables must exist) |
