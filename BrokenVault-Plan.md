# The Broken Vault — Improved Project Plan

> A deliberately insecure Notes App for learning and demonstrating OWASP Top 10 vulnerabilities.  
> Stack: Node.js + Express · MySQL · DaisyUI · Docker  
> Vulnerabilities: SQLi · Stored XSS · Plain-text Passwords

---

## How To Use This Plan

Each phase has three layers:

- **What you build** — concrete deliverables with exact steps, no hand-waving
- **What you learn** — specific concepts you must be able to articulate before moving on
- **What it signals on your resume** — how to frame each phase for recruiters and professors

Do not skip the learning checkpoints. If you cannot answer those questions in your own words, you do not understand the concept — you just typed it.

---

## Vulnerability Scope

| OWASP Risk | Attack Vector | Patch |
|---|---|---|
| A03 – Injection (SQLi) | String-concatenated login + search queries | Parameterized queries via `mysql2` |
| A03 – Injection (XSS) | Raw `innerHTML` rendering of note content | `isomorphic-dompurify` on write + `textContent` on read |
| A07 – Identification Failures | Plain-text password storage | `bcrypt` hash at registration, verify at login |

---

## Database Schema

Write these by hand. No ORM. The point is to see the raw SQL that your attack strings will break.

```sql
CREATE DATABASE IF NOT EXISTS broken_vault;
USE broken_vault;

CREATE TABLE IF NOT EXISTS users (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL   -- plain text Phase 1-2, bcrypt hash Phase 3+
);

CREATE TABLE IF NOT EXISTS notes (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT  NOT NULL,
  title   VARCHAR(200),
  content TEXT,                     -- raw Phase 1-2, sanitized Phase 3+
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  event   VARCHAR(100),
  payload TEXT,
  mode    ENUM('vulnerable', 'secure'),
  ts      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed user (plain-text password for Phase 1-2)
INSERT INTO users (username, password) VALUES ('admin', 'password123');
```

**Why no ORM:** Prepared statements vs. string concatenation is the entire security lesson of this project. An ORM hides that contrast. Raw `mysql2` makes both sides visible.

---

## Phase 0 — Environment Setup

**Goal:** A running Express server connected to MySQL, with Git initialized. Nothing security-related yet. Get this done in one sitting.

### Steps

1. Install Node.js LTS from `nodejs.org`. Verify: `node -v` and `npm -v`.
2. Install MySQL Community Server. Verify: `mysql --version`.
3. Install a MySQL GUI (TablePlus is clean; DBeaver is free). You will use this to visually inspect what attack payloads do to your data.
4. Install Postman or use VS Code's REST Client extension. You will test every API route here before touching the frontend.
5. Create your project directory and initialize Git:

```bash
mkdir broken-vault && cd broken-vault
git init
npm init -y
```

6. Install core dependencies:

```bash
npm install express mysql2 dotenv
npm install --save-dev nodemon
```

7. Create `.env` in the project root:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=broken_vault
PORT=3000
SECURE_MODE=false
```

8. Add `.env` to `.gitignore` immediately:

```
node_modules/
.env
```

9. Create a minimal `server.js`:

```js
require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.send('Broken Vault is running'));

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});
```

10. Create `db.js` for your MySQL connection pool:

```js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = pool.promise();
```

11. Connect to MySQL, create the `broken_vault` database, and run the schema above.
12. Start the server: `npx nodemon server.js`. Confirm `GET /` returns 200.
13. Commit:

```bash
git add .
git commit -m "phase0: environment setup"
```

### Checkpoint — Before Moving On

- `node -v`, `npm -v`, `mysql --version` all return version numbers
- `GET /` returns a 200 response in Postman
- `broken_vault` database exists with all three tables
- `.env` is in `.gitignore` and not staged

### Learning Objectives

You do not need to master these now, but read enough to understand them:

- What a connection pool is and why you use one instead of a single connection per request
- What `dotenv` does and why credentials should never be hardcoded

---

## Phase 1 — Vulnerable Foundation

**Goal:** Build the intentionally broken backend and a functional DaisyUI frontend shell. Every dangerous query gets a comment block explaining exactly why it is dangerous.

### 1-A — Vulnerable Backend Routes

Create `routes/auth.js` and `routes/notes.js`. Import your `db` pool.

**POST `/login` — Vulnerable**

```js
// VULNERABILITY: String concatenation lets the attacker inject arbitrary SQL.
// Input: username = admin, password = ' OR '1'='1' --
// Resulting query: SELECT * FROM users WHERE username='admin' AND password='' OR '1'='1' --'
// MySQL evaluates OR '1'='1' as always true → returns the first row → login succeeds.
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
  const [rows] = await db.query(query);
  if (rows.length > 0) {
    res.json({ success: true, userId: rows[0].id, username: rows[0].username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});
```

**GET `/notes/search` — Vulnerable**

```js
// VULNERABILITY: Raw input injected into UNION SELECT can pull data from any table.
// Input: ' UNION SELECT username, password, 1 FROM users --
// Resulting query appends a second SELECT that returns rows from the users table.
// Column count must match the original SELECT for UNION to work.
app.get('/notes/search', async (req, res) => {
  const { q, userId } = req.query;
  const query = `SELECT id, title, content FROM notes WHERE user_id=${userId} AND title LIKE '%${q}%'`;
  const [rows] = await db.query(query);
  res.json(rows);
});
```

**POST `/notes` — Vulnerable**

```js
// VULNERABILITY: content is stored raw. Any HTML/script tags go straight to the database.
app.post('/notes', async (req, res) => {
  const { userId, title, content } = req.body;
  await db.query(`INSERT INTO notes (user_id, title, content) VALUES (${userId}, '${title}', '${content}')`);
  res.json({ success: true });
});
```

**GET `/notes` — Vulnerable**

```js
app.get('/notes', async (req, res) => {
  const { userId } = req.query;
  const [rows] = await db.query(`SELECT * FROM notes WHERE user_id=${userId}`);
  res.json(rows);
});
```

Test every route in Postman before writing a single line of frontend. Confirm normal inputs work. Then try the attack payloads. See the raw output. Enable MySQL query logging so you can watch exactly what string hits the database:

```sql
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/tmp/mysql_queries.log';
```

### 1-B — DaisyUI Frontend Shell

Install DaisyUI via CDN for now (add to your HTML `<head>`):

```html
<link href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com"></script>
```

Build three pages as static HTML served by Express:

**Navbar** — shared across all pages. Include a mode badge:

```html
<div class="badge badge-error" id="modeBadge">VULNERABLE MODE</div>
```

**Login page** — DaisyUI Card with username + password inputs and a submit button. On submit, call `POST /login` via `fetch`. Store `userId` in `sessionStorage` (good enough for demo purposes — not a security lesson).

**Notes page** — Three sections in this order:
1. Stats bar (three DaisyUI stat cards — hardcode zeros for now)
2. Search bar wired to `GET /notes/search?q=&userId=`
3. DaisyUI Table listing notes returned from `GET /notes?userId=`
4. A "New Note" form with title and content fields, wired to `POST /notes`

**Critical detail for XSS:** When rendering note content into the table, use `innerHTML`, not `textContent`. This is what makes the XSS payload execute.

```js
// Vulnerable render — DO THIS in Phase 1
noteCell.innerHTML = note.content;

// Secure render — switch to this in Phase 3
noteCell.textContent = note.content;
```

### Phase 1 Commit

```bash
git commit -m "phase1: vulnerable foundation"
```

### Checkpoint — Before Moving On

- `POST /login` with valid credentials returns `{ success: true }`
- `POST /login` with `' OR '1'='1' --` as the password also returns `{ success: true }`
- `GET /notes/search` with `' UNION SELECT username, password, 1 FROM users --` returns rows from the users table
- Login page, Notes page render correctly in browser
- MySQL query log shows the raw injected string reaching the database

### Learning Objectives

You must be able to explain all of these before Phase 2:

- What string concatenation allows at the MySQL parser level (not just "it's bad")
- Why `' OR '1'='1' --` causes MySQL to return a row even with the wrong password — trace the logic
- What UNION SELECT requires to succeed (column count match, compatible types) and why
- Why `innerHTML` executes script tags while `textContent` does not (DOM parsing vs. text node insertion)

---

## Phase 2 — Exploit Console

**Goal:** Make the attacks visible and self-explanatory. Anyone watching your demo should understand what is happening without you narrating every line.

### 2-A — Hacker's Console Panel

Add a collapsible drawer to the right side of the Notes page labeled **Hacker's Console**. Inside, display three clickable payload chips:

| Label | Payload | Target Input |
|---|---|---|
| Login Bypass | `' OR '1'='1' --` | Login password field |
| UNION Attack | `' UNION SELECT username, password, 1 FROM users --` | Search bar |
| Stored XSS | `<script>alert('Vault Breached')</script>` | New Note content field |

When a chip is clicked, it autofills the relevant input. This removes all friction during a live demo. Use `data-target` attributes to wire chips to inputs cleanly:

```js
document.querySelectorAll('.payload-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const target = document.querySelector(chip.dataset.target);
    if (target) target.value = chip.dataset.payload;
  });
});
```

### 2-B — Terminal Log Panel

Add a `<pre>` block below the Console labeled **Query Log**. After every API call, fetch the last executed query from a new endpoint `GET /last-query` and display it. On the backend, store the last query string in a module-level variable and expose it:

```js
let lastQuery = '';

// In each route, before executing:
lastQuery = query; // store the raw string

// New route:
app.get('/last-query', (req, res) => res.json({ query: lastQuery }));
```

This is the single most impactful demo element. Seeing `SELECT * FROM users WHERE password='' OR '1'='1'` in real time is worth more than any slide.

### 2-C — Stats Bar (Wired to audit_log)

Update the three stat cards to pull from real data. Add an `INSERT INTO audit_log` call in every vulnerable route:

```js
await db.query(
  `INSERT INTO audit_log (event, payload, mode) VALUES (?, ?, ?)`,
  ['login_attempt', JSON.stringify(req.body), 'vulnerable']
);
```

Add a `GET /stats` endpoint:

```js
app.get('/stats', async (req, res) => {
  const [[{ injections }]] = await db.query(`SELECT COUNT(*) as injections FROM audit_log WHERE event LIKE '%inject%'`);
  const [[{ xss }]]        = await db.query(`SELECT COUNT(*) as xss FROM audit_log WHERE event = 'xss_saved'`);
  const [[{ bypasses }]]   = await db.query(`SELECT COUNT(*) as bypasses FROM audit_log WHERE event = 'login_bypass'`);
  res.json({ injections, xss, bypasses });
});
```

### Phase 2 Commit

```bash
git commit -m "phase2: exploit console"
```

### Checkpoint — Before Moving On

- Login Bypass chip autofills the password field and submits successfully
- UNION Attack chip returns usernames and passwords in the search results table
- XSS chip saves a note with a script tag; on page reload, the alert fires
- Query Log panel shows the raw injected SQL string in real time
- Stats cards update after each attack

### Learning Objectives

- Why does UNION SELECT need the same number of columns as the original query? What error does MySQL throw when they don't match?
- What is the difference between stored XSS and reflected XSS? Why is stored XSS more dangerous?
- If a user visits the Notes page without triggering the attack themselves, can they still be affected? Why?

---

## Phase 3 — Security Patch + Mode Toggle

**Goal:** Fix every flaw with production-correct techniques and make the before/after contrast demonstrable live.

### 3-A — Server-Side Mode Flag

Add `SECURE_MODE` to `.env` and read it at startup. Expose a toggle endpoint:

```js
let secureMode = process.env.SECURE_MODE === 'true';

app.post('/toggle-mode', (req, res) => {
  secureMode = !secureMode;
  res.json({ secureMode });
});
```

Every route function checks `secureMode` and branches to either the vulnerable or secure implementation. Keep both versions in the same file, clearly labeled. Do not delete the vulnerable version.

### 3-B — Prepared Statements

**POST `/login` — Secure**

```js
// SECURE: The ? placeholder is sent to MySQL separately from the query string.
// MySQL compiles the query structure first, then binds the value as data — never as SQL.
// ' OR '1'='1' is treated as a literal string, not executable SQL.
const [rows] = await db.query(
  'SELECT * FROM users WHERE username = ? AND password = ?',
  [username, password]
);
```

**GET `/notes/search` — Secure**

```js
const [rows] = await db.query(
  'SELECT id, title, content FROM notes WHERE user_id = ? AND title LIKE ?',
  [userId, `%${q}%`]
);
```

The key distinction to understand: escaping modifies the input to neutralize special characters. Parameterization separates the query structure from the data entirely — the data never touches the SQL parser. That is why parameterization is structurally superior, not just practically safer.

### 3-C — XSS Sanitization

Install the server-side sanitizer:

```bash
npm install isomorphic-dompurify jsdom
```

In `routes/notes.js`:

```js
const createDOMPurify = require('isomorphic-dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// In the secure POST /notes handler:
const safeContent = DOMPurify.sanitize(content);
await db.query(
  'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
  [userId, title, safeContent]
);
```

Also switch the frontend renderer from `innerHTML` to `textContent` in secure mode. Gate this with a flag passed from the server:

```js
// GET /config endpoint
app.get('/config', (req, res) => res.json({ secureMode }));

// Frontend on page load:
const { secureMode } = await fetch('/config').then(r => r.json());
noteCell[secureMode ? 'textContent' : 'innerHTML'] = note.content;
```

Verify: save `<script>alert('x')</script>` in secure mode, then check MySQL directly. The stored value should be an empty string or stripped of the script tag entirely.

### 3-D — Password Hashing

```bash
npm install bcrypt
```

**POST `/register` — Secure** (add this route for completeness):

```js
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// Secure registration
const hash = await bcrypt.hash(password, SALT_ROUNDS);
await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
```

**POST `/login` — Secure with bcrypt**

```js
const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
if (rows.length === 0) return res.status(401).json({ success: false });

const match = await bcrypt.compare(password, rows[0].password);
if (!match) return res.status(401).json({ success: false });
```

Update `init.sql` to seed the admin user with a pre-generated bcrypt hash so the demo works out of the box in secure mode. Generate the hash once:

```bash
node -e "require('bcrypt').hash('password123', 12).then(console.log)"
```

### 3-E — The Security Toggle (Frontend)

Add a toggle button in the Navbar. On click, call `POST /toggle-mode` and update the UI:

```js
toggleBtn.addEventListener('click', async () => {
  const { secureMode } = await fetch('/toggle-mode', { method: 'POST' }).then(r => r.json());
  modeBadge.textContent = secureMode ? 'SECURE MODE' : 'VULNERABLE MODE';
  modeBadge.className   = secureMode ? 'badge badge-success' : 'badge badge-error';
});
```

The toggle is server-side because the flag gates actual query logic on the server. A client-side toggle is trivially bypassed by calling the API directly — which would make the entire security demonstration invalid.

### Phase 3 Commit

```bash
git commit -m "phase3: security patch complete"
```

### Checkpoint — Before Moving On

- In secure mode: `' OR '1'='1' --` returns `Invalid credentials`
- In secure mode: UNION attack returns zero results and the query log shows `?` placeholders
- In secure mode: XSS payload is stored as plain text and renders harmlessly
- `users` table shows `$2b$` prefixed hashes in secure mode
- Mode toggle switches badge color and all behavior instantly, without a page reload

### Learning Objectives

- Explain the structural difference between escaping and parameterization. Why can a clever escape bypass be constructed, but a parameterized query cannot be bypassed at all?
- What does bcrypt's cost factor (SALT_ROUNDS) control? What is the tradeoff between a higher and lower value?
- Why is the mode toggle server-side? Describe an exact attack that would work if it were client-side only.

---

## Phase 4 — Docker Portability

**Goal:** One command starts the entire stack on any Linux machine with Docker installed. No Node.js, no MySQL, no setup required on the lab machine.

### 4-A — Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files first — Docker caches this layer.
# Rebuilds only re-run npm install if package.json changed, not on every source change.
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### 4-B — docker-compose.yml

```yaml
services:
  db:
    image: mysql:8
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: broken_vault
    volumes:
      - db_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      retries: 10

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db        # NOT localhost — containers resolve each other by service name
      DB_USER: root
      DB_PASSWORD: root
      DB_NAME: broken_vault
      SECURE_MODE: "false"
    depends_on:
      db:
        condition: service_healthy

volumes:
  db_data:
```

### 4-C — init.sql

The file mounted at `/docker-entrypoint-initdb.d/init.sql` runs automatically on first MySQL boot. Copy your full schema from the top of this document into `init.sql`. Also include the bcrypt-hashed seed user (generated in Phase 3) so both modes work immediately without manual setup.

### 4-D — Demo Day Commands

Print this. Keep it with you.

| Step | Command |
|---|---|
| Clone or copy project | `git clone <url>` or USB copy |
| Enter directory | `cd broken-vault` |
| Start everything | `docker compose up --build` |
| Wait for | `Server listening on port 3000` |
| Open browser | `http://localhost:3000` |
| Stop | `Ctrl+C` then `docker compose down` |
| Full wipe + fresh start | `docker compose down -v && docker compose up --build` |

**Dry run this on your own machine before demo day.** Run `docker compose down -v` to wipe everything, then `docker compose up --build` from scratch. If it works clean on your machine, it works on the lab machine.

### Phase 4 Commit

```bash
git commit -m "phase4: docker portability"
```

### Checkpoint — Before Moving On

- `docker compose up --build` starts both containers without errors
- `http://localhost:3000` loads the app
- Schema and seed user are created automatically without any manual SQL
- `docker compose down -v && docker compose up --build` works cleanly from zero

### Learning Objectives

- Why is `DB_HOST: db` and not `DB_HOST: localhost` in the compose file?
- What does the `healthcheck` block prevent? What happens without it?
- What does the named volume `db_data` do? What happens to data if you remove the volume block?

---

## Professor Demo Script

Walk this sequence in under 10 minutes. It is structured to show both sides of every vulnerability back to back.

| # | Action | Talking Point |
|---|---|---|
| 1 | Open app in VULNERABLE MODE (red badge) | "This is a normal-looking Notes app. The backend is running raw SQL with no protection." |
| 2 | Log in with valid credentials | "Normal login works. Establish the baseline." |
| 3 | Click Login Bypass chip. Submit. | "No password needed. Point at the Query Log — show the injected string. Explain OR '1'='1'." |
| 4 | Click UNION Attack chip in search. Submit. | "Usernames and passwords in the results. Explain UNION SELECT and why column count matters." |
| 5 | Click XSS chip. Save note. Reload page. | "The alert fires on page load. Explain stored vs reflected XSS — the payload lives in the DB." |
| 6 | Hit Security Toggle → SECURE MODE (green badge) | "One toggle. Let's patch all three simultaneously." |
| 7 | Repeat steps 3, 4, 5 in Secure Mode | "Login bypass fails. UNION returns nothing. XSS renders as text. Show the Query Log — ? placeholders. Show the DB — bcrypt hash." |
| 8 | Q&A | Be ready for: "Why not just sanitize input?" Answer: sanitization is context-dependent and error-prone. Parameterization separates data from code structurally — there is no edge case to miss. |

---

## Resume and Portfolio Positioning

This project demonstrates several distinct skills that are worth calling out explicitly.

**Project title for resume:**  
`The Broken Vault — Offensive Security Demonstration App`

**One-line description:**  
Built a deliberately vulnerable web app demonstrating SQL Injection, Stored XSS, and broken authentication, then patched all three with production-grade mitigations including parameterized queries, DOMPurify sanitization, and bcrypt hashing.

**Bullet points for resume (pick 2-3):**

- Implemented and exploited three OWASP Top 10 (2021) vulnerabilities — SQLi, Stored XSS, and A07 Identification Failures — in a controlled environment with live attack payloads and real-time query logging
- Patched all vulnerabilities using production techniques: `mysql2` parameterized queries, server-side `isomorphic-dompurify` sanitization, and `bcrypt` password hashing with configurable cost factor
- Containerized the full stack (Node.js + MySQL) with Docker Compose, including automated schema initialization and a health-checked startup sequence for zero-configuration deployment

**What makes this stand out beyond typical "build a todo app" projects:**

- The mode toggle is server-side, which demonstrates understanding of why client-side security controls are not controls
- The Query Log panel shows the raw injected SQL string in real time — this is not a slide, it is live execution
- The audit_log table tracks real events, not mocked data
- Docker deployment means anyone can run it, which matters for open-source credibility

**GitHub README must include:**

- A GIF or short screen recording of the exploit console in action (use ShareX or OBS to record, Ezgif to compress)
- The OWASP risk table from this document
- Step-by-step setup instructions (`docker compose up --build` should be the entire setup)
- A "What I learned" section written in your own words — recruiters and professors both read this

---

## Self-Assessment Checklist

Do not consider this project done until you can answer every question below in your own words, without looking anything up.

**SQL Injection**
- What exactly does string concatenation allow an attacker to do at the MySQL parser level?
- Why does `' OR '1'='1' --` cause a login to succeed without the correct password?
- What does UNION SELECT require to succeed? What error does MySQL throw if column counts differ?
- What is the structural difference between input escaping and parameterization? Why does parameterization win?

**Stored XSS**
- What is the difference between stored and reflected XSS?
- Why does `innerHTML` execute script tags while `textContent` does not?
- What does DOMPurify actually do to `<script>alert('x')</script>` before it reaches the database?
- Can a user be affected by stored XSS without clicking anything? Why?

**Password Storage**
- Why are plain-text passwords catastrophic in a data breach, even if the login endpoint is protected?
- What does bcrypt's salt prevent? What does the cost factor control?
- Why does the UNION attack become significantly more dangerous when passwords are stored in plain text?

**Architecture**
- Why is the mode toggle server-side? Describe the exact bypass that would work if it were client-side.
- Trace the full request lifecycle for a login attempt in both modes, from browser to MySQL and back.
- Why does Docker Compose use `DB_HOST: db` instead of `DB_HOST: localhost`?