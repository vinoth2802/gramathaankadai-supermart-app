# Deployment Guide

> **Stack:** Node/Express API → Railway | React/Vite client → Netlify | MySQL → Railway

---

## Prerequisites

- GitHub repo pushed and up to date
- [Railway](https://railway.app) account
- [Netlify](https://netlify.com) account

---

## Part 1 — Railway (API + Database)

### Step 1 — Create a new Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Empty Project**

---

### Step 2 — Add MySQL database

1. Inside the project click **+ New** → **Database** → **MySQL**
2. Railway provisions MySQL and sets these variables automatically:
   - `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQL_URL`
3. Click the MySQL service → **Variables** tab → copy the values, you'll need them shortly

---

### Step 3 — Run Migrations (Flyway)

1. Click **+ New** → **GitHub Repo** → select your repo
2. In the service settings → **Settings** → **Builder** → set **Dockerfile Path** to:
   ```
   Dockerfile.migrations
   ```
3. Go to **Variables** tab → add:

   | Variable | Value |
   |----------|-------|
   | `FLYWAY_URL` | `jdbc:mysql://<MYSQLHOST>:<MYSQLPORT>/<MYSQLDATABASE>?allowPublicKeyRetrieval=true&useSSL=false` |
   | `FLYWAY_USER` | *(copy from MySQL service → MYSQLUSER)* |
   | `FLYWAY_PASSWORD` | *(copy from MySQL service → MYSQLPASSWORD)* |

   > Replace `<MYSQLHOST>`, `<MYSQLPORT>`, `<MYSQLDATABASE>` with the actual values from Step 2.

4. Click **Deploy** — wait for it to finish (green ✓). This creates all tables.

---

### Step 4 — Seed the Database

1. Click **+ New** → **GitHub Repo** → select your repo again
2. Set **Dockerfile Path** to:
   ```
   Dockerfile.seed
   ```
3. Go to **Variables** tab → add:

   | Variable | Value |
   |----------|-------|
   | `MYSQLHOST` | *(from MySQL service)* |
   | `MYSQLPORT` | *(from MySQL service)* |
   | `MYSQLUSER` | *(from MySQL service)* |
   | `MYSQLPASSWORD` | *(from MySQL service)* |
   | `MYSQLDATABASE` | *(from MySQL service)* |

4. Click **Deploy** — wait for green ✓. This inserts default tenant, admin user, etc.
5. Once done you can **remove** this service (it's a one-time job).

---

### Step 5 — Deploy the API

1. Click **+ New** → **GitHub Repo** → select your repo again
2. Set **Dockerfile Path** to:
   ```
   Dockerfile.app
   ```
3. Go to **Variables** tab → add:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | *(copy `MYSQL_URL` from MySQL service — it's already in the right format)* |
   | `NODE_ENV` | `production` |

   > Do **not** set `PORT` — Railway injects it automatically.

4. Click **Deploy** → wait for green ✓
5. Go to **Settings** → **Networking** → **Generate Domain**
6. Copy the domain — it looks like `https://your-app.railway.app`
   **Save this URL, you need it for Netlify.**

---

## Part 2 — Netlify (React Client)

### Step 1 — Connect repo

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
2. Choose **GitHub** → select your repo

### Step 2 — Build settings

Netlify will auto-detect from `netlify.toml`. Confirm these are set:

| Setting | Value |
|---------|-------|
| Base directory | `client` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

### Step 3 — Set environment variable

1. Go to **Site configuration** → **Environment variables** → **Add variable**
2. Add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://your-app.railway.app/api` |

   > Use the Railway domain from Part 1, Step 5.

### Step 4 — Deploy

1. Click **Deploy site**
2. Wait for build to finish
3. Your app is live at `https://your-site.netlify.app`

---

## Part 3 — After Deployment

### Test the API is healthy
Open in browser:
```
https://your-app.railway.app/api/health
```
Should return: `{"status":"ok"}`

### Test the client
Open your Netlify URL → login page should appear.

Default admin credentials (from seed):
- **Email:** `admin@gramathaankadai.com`
- **Password:** `1234`

> Change the password immediately after first login.

---

## Redeployment (future updates)

- **API** — push to GitHub → Railway auto-redeploys
- **Client** — push to GitHub → Netlify auto-redeploys
- **Migrations** — only needed when you add new SQL migration files; redeploy the migrations service manually

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 502/503 | Check Railway logs → likely a `DATABASE_URL` error |
| Client shows blank page | Check browser console → likely wrong `VITE_API_URL` |
| Login fails with "Cannot connect to server" | `VITE_API_URL` is missing `/api` at the end |
| Flyway migration fails | Check `FLYWAY_URL` format — must start with `jdbc:mysql://` |
| Seed fails | Run migrations first; seed assumes tables already exist |
