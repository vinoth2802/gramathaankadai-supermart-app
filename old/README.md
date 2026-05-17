# SuperMart — Gramathaankadai POS & Business Management System

> **This guide is written for non-coders.** Every step is explained in simple language. Follow each step carefully and you will have the app running on your computer.

---

## Table of Contents

1. [What is this project?](#1-what-is-this-project)
2. [What you need to install first](#2-what-you-need-to-install-first)
3. [How to install Node.js](#3-how-to-install-nodejs)
4. [How to install VS Code](#4-how-to-install-vs-code)
5. [How to install Git](#5-how-to-install-git)
6. [How to download this project from GitHub](#6-how-to-download-this-project-from-github)
7. [How to open the project in VS Code](#7-how-to-open-the-project-in-vs-code)
8. [How to open the Terminal](#8-how-to-open-the-terminal)
9. [How to install and run the project](#9-how-to-install-and-run-the-project)
10. [How to use the app](#10-how-to-use-the-app)
11. [Project folder structure explained](#11-project-folder-structure-explained)
12. [How to add a new page safely](#12-how-to-add-a-new-page-safely)
13. [How to add a new sidebar menu link](#13-how-to-add-a-new-sidebar-menu-link)
14. [How to add a new data field in the database](#14-how-to-add-a-new-data-field-in-the-database)
15. [Common mistakes and how to fix them](#15-common-mistakes-and-how-to-fix-them)
16. [Saving your changes to GitHub](#16-saving-your-changes-to-github)
17. [Daily usage — start and stop the app](#17-daily-usage--start-and-stop-the-app)

---

## 1. What is this project?

SuperMart is a **Point of Sale (POS) and Business Management app** built specifically for Gramathaankadai. It runs in your web browser (like a website) but works fully on your own computer without needing internet.

**Features include:**
- POS billing with barcode scanner support
- Inventory management
- Purchase entry and reports
- Party (customer & supplier) management
- Payment tracking (cash, UPI, bank, cheque)
- Sales and GST reports (GSTR-1, GSTR-3B)
- Import/Export data via CSV
- Audit log for all actions
- User profile with avatar

**Default login credentials:**
- Username: `admin`
- Password: `1234`

---

## 2. What you need to install first

You need to install **three free programs** before you can run this project:

| Program | What it does | Where to get it |
|---------|-------------|-----------------|
| **Node.js** | Runs the app's backend server | nodejs.org |
| **VS Code** | The editor where you view and edit project files | code.visualstudio.com |
| **Git** | Downloads the project from GitHub | git-scm.com |

---

## 3. How to install Node.js

Node.js is what powers the local server that the app uses to store and read data.

### On Windows:
1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"** (Long Term Support — the stable version)
3. Download the `.msi` file and run it
4. Click **Next → Next → Install** (keep all default settings)
5. When it finishes, click **Finish**

### On Mac:
1. Go to **https://nodejs.org**
2. Click the big green **"LTS"** button
3. Download the `.pkg` file and open it
4. Click **Continue → Continue → Install**
5. Enter your Mac password if asked, then click **Install Software**

### Verify it worked:
Open Terminal (explained in Step 8) and type this, then press Enter:
```
node --version
```
You should see something like `v20.11.0`. If you see a version number, Node.js is installed correctly.

---

## 4. How to install VS Code

VS Code is a free code editor where you will open and edit the project files.

### On Windows or Mac:
1. Go to **https://code.visualstudio.com**
2. Click the big **Download** button (it auto-detects your operating system)
3. Run the downloaded file and follow the installation steps
4. On Windows: check the box **"Add to PATH"** during installation — this is important!
5. Open VS Code when installation is done

### Useful VS Code Extensions (optional):
After opening VS Code, click the **Extensions icon** (looks like 4 squares) on the left sidebar and install:
- **Prettier** — automatically formats your code neatly
- **Auto Rename Tag** — helps when editing HTML tags

---

## 5. How to install Git

Git lets you download ("pull") the project from GitHub and save ("push") your changes back.

### On Windows:
1. Go to **https://git-scm.com/download/win**
2. Download the installer and run it
3. Click **Next** through all the steps — all default settings are fine
4. On the step **"Choosing the default editor"**, select **Visual Studio Code** from the dropdown

### On Mac:
1. Open Terminal (explained in Step 8)
2. Type `git --version` and press Enter
3. If Git is not installed, Mac will automatically prompt you to install it — click **Install**

### Verify it worked:
In Terminal, type:
```
git --version
```
You should see something like `git version 2.43.0`.

---

## 6. How to download this project from GitHub

This is called "cloning" — it copies the entire project from GitHub to your computer.

### Step 1 — Choose where to save the project

Decide a folder on your computer where you want to keep the project. For example:
- Windows: `C:\Projects\`
- Mac: `~/Documents/Projects/`

Create that folder if it does not exist yet.

### Step 2 — Open Terminal in that folder

**On Windows:**
1. Open File Explorer and go to your chosen folder
2. Click in the address bar at the top, type `cmd`, and press Enter
3. A black Command Prompt window opens already inside that folder

**On Mac:**
1. Open Terminal (see Step 8)
2. Navigate to your folder by typing:
   ```
   cd ~/Documents/Projects
   ```
   (Replace the path with wherever your folder actually is)

### Step 3 — Clone the repository

Type this exact command and press Enter:
```
git clone https://github.com/vinoth2802/gramathankadai-supermart-app.git
```

You will see text scrolling showing the download progress. When the cursor returns, the download is complete.

### Step 4 — Enter the project folder

Type:
```
cd gramathankadai-supermart-app
```

You are now inside the project folder and ready for the next steps.

---

## 7. How to open the project in VS Code

### Method 1 — From Terminal (fastest):
While inside the project folder in Terminal, type:
```
code .
```
(The word `code`, a space, then a dot)

VS Code opens and shows all the project files in the left panel.

### Method 2 — From inside VS Code:
1. Open VS Code
2. Click **File** in the top menu bar
3. Click **Open Folder...**
4. Navigate to and select the `gramathankadai-supermart-app` folder
5. Click **Open** (or **Select Folder** on Windows)

The project files appear in the left sidebar under "Explorer".

---

## 8. How to open the Terminal

The Terminal is a text window where you type commands to control your computer.

### Inside VS Code (recommended):
1. Open VS Code with your project open
2. Click **Terminal** in the top menu bar
3. Click **New Terminal**
4. A panel appears at the bottom of VS Code — this is your Terminal
5. It is already inside your project folder automatically ✓

### On Windows (standalone):
- Press `Windows key + R`, type `cmd`, press Enter
- Or search for "Command Prompt" in the Start menu

### On Mac (standalone):
- Press `Command + Space`, type `Terminal`, press Enter
- Or go to **Applications → Utilities → Terminal**

> **Always use the Terminal inside VS Code** when working on this project — it automatically knows you are in the project folder.

---

## 9. How to install and run the project

### First-time setup (do this only once after cloning):

Open the Terminal in VS Code and type:
```
npm install
```

This downloads all the libraries the project needs. You will see a lot of text scrolling. Wait for it to finish — it may take 1–3 minutes. When you see your cursor return with a message like `added 123 packages`, it is done.

### Every time you want to run the app:

Type:
```
npm run dev
```

You will see output like this:
```
[0]   ➜  Local:   http://localhost:5173/
[1]   Resources at http://localhost:3000
```

This means **two servers are running**:
- The **app** (Vite) at `http://localhost:5173`
- The **data server** (json-server) at `http://localhost:3000`

Both must be running for the app to work.

### Open the app in your browser:

Your browser should open automatically. If it does not:
1. Open **Chrome** or any browser
2. Go to: **http://localhost:5173**
3. You will see the SuperMart login page

### Log in:
- Username: `admin`
- Password: `1234`

### To STOP the app:
In the Terminal, press **Ctrl + C** (Windows) or **Cmd + C** (Mac).
Type `Y` and press Enter if it asks to confirm.

> The app only works while the Terminal is running `npm run dev`. Closing the Terminal or VS Code stops the app. This is normal behavior.

---

## 10. How to use the app

### Key pages and what they do:

| Page | What it does |
|------|-------------|
| **Dashboard** | Overview — today's sales, totals, charts |
| **POS / Billing** | Create bills and record sales |
| **Purchase** | Record stock purchases from suppliers |
| **Inventory** | View and manage all products |
| **Parties** | Manage customers and suppliers |
| **Sales History** | View all past sales with expandable item details |
| **Purchase Report** | View purchases by date with expandable item details |
| **Reports** | GST reports, daily summary, party balances |
| **Accounts** | Cash in hand, bank accounts, cheques, loans, payments |
| **Settings** | Business info, taxes, units of measure, audit log |
| **Import/Export** | Bulk upload or download data as CSV files |

### Where your data is stored:
All data is saved in the file **`server/db.json`** on your computer. This is your database. Back this file up regularly by copying it to a safe place (Google Drive, USB drive, etc.).

---

## 11. Project folder structure explained

```
gramathankadai-supermart-app/
│
├── index.html                  ← Login page (the first page users see)
├── package.json                ← Project settings and scripts (don't touch)
│
├── server/
│   ├── db.json                 ← YOUR DATABASE — all data is stored here
│   ├── routes.json             ← URL shortcuts for the server (don't touch)
│   └── middleware.js           ← Server configuration (don't touch)
│
└── src/
    ├── api/                    ← Files that read/write data from the database
    │   ├── client.js           ← Base connection to the server (don't touch)
    │   ├── items.api.js        ← Functions for products and inventory
    │   ├── parties.api.js      ← Functions for customers and suppliers
    │   ├── sales.api.js        ← Functions for sales data
    │   ├── purchases.api.js    ← Functions for purchase data
    │   └── accounts.api.js     ← Functions for accounts data
    │
    ├── components/
    │   └── sidebar.js          ← The navigation menu shown on every page
    │
    ├── utils/
    │   └── formatters.js       ← Helpers for formatting dates and currency
    │
    └── pages/                  ← All the HTML pages of the app
        ├── dashboard/
        ├── pos/
        ├── inventory/
        ├── purchases/
        ├── parties/
        ├── sales/
        ├── payments/
        ├── accounts/
        ├── reports/
        ├── settings/
        └── import-export/
```

### Rule of thumb:
- **Adding or editing pages** → work in `src/pages/`
- **Adding menu items** → edit `src/components/sidebar.js`
- **Adding new data types** → edit `server/db.json`
- **Never touch** → `package.json`, `server/middleware.js`, `server/routes.json`, `src/api/client.js`

---

## 12. How to add a new page safely

The safest way to add a new page is to **copy an existing page** and modify it. This ensures you never miss a required element.

### Step 1 — Copy an existing page

In VS Code's Explorer panel on the left:
1. Right-click on a simple existing page like `src/pages/settings/settings.html`
2. Click **Copy**
3. Right-click the folder where you want the new page (e.g., `src/pages/`)
4. Click **Paste**
5. Right-click the pasted file → **Rename** → name it something like `my-new-page.html`

### Step 2 — The required structure every page must follow

Every page MUST have these elements. **Do not remove them:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Page Title - SuperMart</title>

  <!-- REQUIRED: Tailwind CSS for all styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- REQUIRED: Font Awesome icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body class="bg-slate-50 min-h-screen">

  <!-- REQUIRED: The sidebar is injected here automatically -->
  <div id="sidebar-container"></div>

  <!-- REQUIRED: ml-64 adds space so content doesn't hide behind the sidebar -->
  <div class="ml-64 min-h-screen p-8">

    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Page Title</h1>
        <p class="text-slate-500 text-sm mt-0.5">Short description of this page</p>
      </div>
      <!-- REQUIRED: User profile badge appears here -->
      <div id="user-info"></div>
    </div>

    <!-- Your content goes here -->

  </div>

  <!-- REQUIRED: Scripts must be loaded in this exact order -->
  <script src="/src/api/client.js"></script>
  <script src="/src/utils/formatters.js"></script>
  <script src="/src/components/sidebar.js"></script>
  <script>
    // REQUIRED: Redirect to login if not logged in
    checkAuth();

    // Your JavaScript goes here

  </script>
</body>
</html>
```

### Step 3 — Common content patterns to copy and use

**A white card section:**
```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
  <h2 class="text-base font-bold text-slate-800 mb-4">Section Heading</h2>
  <!-- your content -->
</div>
```

**A data table:**
```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
  <table class="w-full text-sm">
    <thead class="bg-slate-800 text-white">
      <tr>
        <th class="px-4 py-3.5 text-left font-semibold text-xs uppercase tracking-wide">Name</th>
        <th class="px-4 py-3.5 text-left font-semibold text-xs uppercase tracking-wide">Value</th>
      </tr>
    </thead>
    <tbody id="myTableBody" class="divide-y divide-slate-100">
      <!-- rows will be added by JavaScript -->
    </tbody>
  </table>
</div>
```

**Buttons:**
```html
<!-- Primary (amber) button -->
<button onclick="myFunction()" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition">
  <i class="fas fa-plus mr-2"></i> Add Item
</button>

<!-- Success (green) button -->
<button onclick="saveData()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition">
  <i class="fas fa-save mr-2"></i> Save
</button>

<!-- Danger (red) button -->
<button onclick="deleteItem()" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition">
  <i class="fas fa-trash mr-2"></i> Delete
</button>
```

**A text input:**
```html
<div>
  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Field Label</label>
  <input type="text" id="myInput" placeholder="Enter value..."
         class="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm text-slate-800">
</div>
```

---

## 13. How to add a new sidebar menu link

Open `src/components/sidebar.js` in VS Code.

The sidebar has 4 sections. Look for these comment labels inside the `insertSidebar` function:
- `<!-- Main Menu -->` — main navigation items
- `<!-- Reports & Data -->` (Analytics section)
- `<!-- Tools -->` — utility pages
- `<!-- System -->` — settings pages

To add a simple link, find the `</ul>` closing tag of your chosen section and add before it:

```javascript
<li>
  <a onclick="navigateTo('${p('my-folder/my-new-page.html')}')"
     class="sidebar-link flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-all border-l-2 border-transparent"
     data-page="my-new-page">
    <i class="fas fa-star w-4 text-base text-slate-500"></i>
    <span class="text-sm font-medium">My New Page</span>
  </a>
</li>
```

**Replace these values:**

| Placeholder | Replace with |
|-------------|-------------|
| `my-folder/my-new-page.html` | Path to your page from inside `src/pages/` |
| `my-new-page` | A unique short ID for this page (no spaces) |
| `fa-star` | Icon name from fontawesome.com/icons |
| `My New Page` | The label shown in the sidebar |

### Finding icon names:
1. Go to **https://fontawesome.com/icons**
2. Search for the icon you want (e.g., "chart", "users", "box")
3. Click an icon that says **"Free"**
4. Copy the class shown (e.g., `fa-chart-line`)
5. Use it as `fas fa-chart-line` in the icon element

---

## 14. How to add a new data field in the database

The database is `server/db.json`. It stores all data in JSON format.

### Stop the server before editing db.json manually!

Always press **Ctrl + C** in the Terminal to stop the server before you edit `db.json`. If the server is running while you edit the file, it may overwrite your changes.

### Understanding JSON basics:

```json
{
  "products": [
    {
      "id": 1,
      "name": "Rice",
      "price": 50
    },
    {
      "id": 2,
      "name": "Oil",
      "price": 120
    }
  ]
}
```

Key rules:
- `{ }` — groups related fields together (an object)
- `[ ]` — a list of items
- Every field except the **last** one in an object needs a **comma** after it
- The last item in a list has **no comma** after the closing `}`

### To add a new type of data (a new collection):

Find the end of `db.json` (before the final `}`) and add:

```json
  "expenses": [
    {
      "id": 1,
      "description": "Electricity bill",
      "amount": 2500,
      "date": "2026-03-30"
    }
  ]
```

This automatically creates a new API at `http://localhost:3000/expenses` when you restart the server.

### To read this data in a page:

```javascript
async function loadExpenses() {
  const res  = await fetch('http://localhost:3000/expenses');
  const data = await res.json();
  console.log(data); // open browser → F12 → Console to see the data
}
loadExpenses();
```

### To add a field to existing items:

Find the items in `db.json` and add the new field. For example, add `"barcode"` to products:

```json
{
  "id": 1,
  "shortName": "Tata Salt",
  "salesPrice": 22,
  "barcode": "8901058001298"
}
```

> After editing `db.json`, save the file (Ctrl+S / Cmd+S) and restart the server with `npm run dev`.

---

## 15. Common mistakes and how to fix them

### The app won't start — "npm: command not found"
Node.js is not installed or not added to PATH.
- Re-install Node.js from nodejs.org
- During installation on Windows, make sure to check **"Add to PATH"**
- Restart your computer after installation

### The app opens but shows a blank white page
Open the browser's developer console to see errors:
1. Press **F12** in your browser
2. Click the **Console** tab
3. Look for red error messages — they tell you exactly what is wrong

Common causes:
- A script file path is wrong — check all `<script src="...">` paths
- A JavaScript syntax error — look at the line number in the error

### Data is not loading — "Failed to fetch" error
The json-server (data server) is not running.
- Make sure you used `npm run dev` (not `npm start`)
- Both servers must run together — you should see TWO URL messages when starting

### Page content is hidden behind the sidebar
Your page content div is missing `ml-64`:
```html
<!-- Wrong: -->
<div class="min-h-screen p-8">

<!-- Correct: -->
<div class="ml-64 min-h-screen p-8">
```

### Sidebar/navigation is not showing on my new page
You are missing one or both of these in your HTML:
```html
<div id="sidebar-container"></div>
```
```html
<script src="/src/components/sidebar.js"></script>
```

### Red underlines in db.json — JSON is invalid
Common JSON mistakes:

```json
// Wrong — extra comma after last item:
["apple", "banana",]

// Correct:
["apple", "banana"]

// Wrong — missing comma between items:
{"id": 1} {"id": 2}

// Correct:
{"id": 1}, {"id": 2}
```

In VS Code, press **Ctrl+Shift+P** (Windows) or **Cmd+Shift+P** (Mac), type **"Format Document"** and press Enter — it will highlight where the JSON error is.

### My changes to db.json disappeared
You probably edited the file while the server was running. json-server may overwrite manual edits.
- Always stop the server with **Ctrl+C** before manually editing `db.json`
- Then restart with `npm run dev` after saving

### The app is asking me to log in even though I just logged in
Your browser session was cleared (e.g., cleared browser data).
- Simply log in again: `admin` / `1234`
- This is normal — login sessions are stored in your browser

---

## 16. Saving your changes to GitHub

After making changes you want to keep, save them to GitHub as a backup.

### Step 1 — Open Terminal in VS Code

### Step 2 — Check what changed:
```
git status
```
You will see a list of modified files.

### Step 3 — Stage all your changes:
```
git add .
```

### Step 4 — Save with a description:
```
git commit -m "Added expense tracking page"
```
Write a short message describing what you changed. Use plain English.

### Step 5 — Upload to GitHub:
```
git push
```

If asked for credentials:
- Username: your GitHub username
- Password: your GitHub **Personal Access Token** (not your account password)

To create a Personal Access Token:
1. Go to GitHub.com and log in
2. Click your profile picture → **Settings**
3. Scroll down → **Developer settings**
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token (classic)**
6. Give it a name, set expiration, check the **repo** checkbox
7. Click **Generate token** — copy and save the token immediately

### To get the latest changes made by someone else:
```
git pull
```

Run this before starting work each day if others are also editing the project.

---

## 17. Daily usage — start and stop the app

### Starting the app each day:

1. Open **VS Code**
2. Open the project: **File → Open Recent → gramathankadai-supermart-app**
3. Open Terminal: **Terminal → New Terminal**
4. Type and press Enter:
   ```
   npm run dev
   ```
5. Wait until you see: `Local: http://localhost:5173/`
6. Open **Chrome** and go to: **http://localhost:5173**
7. Log in: `admin` / `1234`

### Stopping the app:

1. Click inside the Terminal panel
2. Press **Ctrl + C** (Windows) or **Cmd + C** (Mac)
3. Type `Y` if it asks to confirm, then press Enter
4. Close VS Code

---

## Quick Reference Card

### Commands:

| What you want to do | Command to type |
|---------------------|----------------|
| Start the app | `npm run dev` |
| Stop the app | `Ctrl + C` |
| Install after fresh clone | `npm install` |
| Download latest from GitHub | `git pull` |
| Check what files changed | `git status` |
| Stage changes to save | `git add .` |
| Save with a message | `git commit -m "your message"` |
| Upload to GitHub | `git push` |

### URLs (app must be running):

| Page | Address to type in browser |
|------|---------------------------|
| Login | http://localhost:5173 |
| Dashboard | http://localhost:5173/src/pages/dashboard/dashboard.html |
| POS / Billing | http://localhost:5173/src/pages/pos/pos.html |
| Inventory | http://localhost:5173/src/pages/inventory/inventory.html |

### Login:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `1234` |

---

*SuperMart POS — Built for Gramathaankadai, Tamil Nadu*
