# BrokenVault

**Warning: This app is intentionally insecure. Do not deploy it anywhere real.**

BrokenVault is a notes app with working SQL injection, stored XSS, and plain text credential flaws. Use it to practice and demo OWASP attacks locally. A runtime toggle switches every route between vulnerable and secure code.

The stack is Node.js with Express, SQLite through `better-sqlite3`, and static HTML styled with Tailwind and DaisyUI.

## Notes

Claude set up Express and Node, connected the database, styled the frontend, and drafted this README. I designed the vulnerabilities, wrote the exploit payloads, and built the vulnerable and secure modes by hand.

`SECURE_MODE` in `.env` sets the starting mode. You can change modes at runtime without a restart. The `mysql2` package is installed but unused. There are no Docker files.

## Setup

You need Node.js 20. Clone the repository, then run these commands.

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000/login.html`.

## Scripts

| Command | Effect |
|---|---|
| `npm start` | Runs the server with Node. |
| `npm run dev` | Runs the server with Nodemon and restarts on file changes. |
| `npm run build:css` | Rebuilds Tailwind CSS whenever the input changes. |
| `npm run build:css:prod` | Builds minified Tailwind CSS. |

## Vulnerabilities

| OWASP Risk | Where |
|---|---|
| A03 Injection (SQLi) | String interpolation in `/login` and every notes route. |
| A03 Injection (XSS) | Note content written into table cells as raw HTML. |
| A07 Identification Failures | Seeded admin password stored in plain text. |

## Vulnerable Routes

`POST /login` runs this query.

```sql
SELECT * FROM users WHERE username = '${username}' AND password='${password}'
```

Enter `' OR '1'='1' --` as the password to log in without credentials.

`GET /notes/search` runs this query.

```sql
SELECT id, title, content FROM notes WHERE user_id = ${userId} AND title LIKE '%${q}%'
```

Send `q=' UNION SELECT username, password, 1 FROM users --` to dump usernames and passwords.

`POST /notes` stores titles and content unchanged. Save `<script>alert('Vault Breached')</script>` as a note to trigger stored XSS.

`GET /notes` and `DELETE /notes/:id` interpolate IDs into SQL as well.

## Secure Mode

`POST /toggle-mode` flips a server-side flag. In secure mode the routes use parameterized queries, check passwords against bcrypt hashes, and sanitize note content with DOMPurify before saving. The client renders notes as text instead of setting `innerHTML`.

Both versions of each route live in the same file, and the flag picks which branch runs.

## Key Files

| File | Purpose |
|---|---|
| `server.js` | Starts Express, creates the schema, and seeds the admin account. |
| `db.js` | Opens the SQLite connection and wraps it in Promises. |
| `routes/auth.js` | Vulnerable login plus secure registration and login. |
| `routes/notes.js` | Vulnerable and secure CRUD and search for notes. |
| `routes/observability.js` | Serves `GET /stats` and `GET /last-query`. |
| `routes/config.js` | Configuration and the mode toggle. |
| `public/login.html` | Login page with secure registration and the mode toggle. |
| `public/notes.html` | Notes UI with payload chips, live stats, a last query panel, and mode-aware rendering. |

## Checklist

- `npm run dev` starts without errors.
- `' OR '1'='1' --` bypasses `POST /login`.
- `GET /notes/search` accepts UNION payloads.
- `GET /stats` shows non-zero counters after an attack.
- `GET /last-query` shows the last tracked SQL statement.
- A malicious note runs its script when the notes page loads.
- `POST /toggle-mode` switches to secure mode.
- The login bypass fails in secure mode.
- `POST /register` stores bcrypt hashes in secure mode.
- Notes created in secure mode are sanitized and render as text.
- Git ignores `.env`.
