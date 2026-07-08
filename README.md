# BrokenVault

**Warning: This app is intentionally insecure. Do not deploy it to any real environment.**

BrokenVault is a deliberately broken web app. It ships with real, working vulnerabilities so you can study and demo OWASP attack patterns without setting up anything complex. The app uses Node.js and Express for the backend, SQLite for the database, and static HTML styled with DaisyUI and Tailwind for the frontend. You can toggle the app between vulnerable and secure modes while it runs.

## Note
- Claude helped set up Express and Node, connect the database, style the frontend, and draft this documentation. I designed the vulnerabilities, wrote the exploit payloads, and built the secure and vulnerable modes manually.

- The `SECURE_MODE` environment variable sets the initial runtime mode. You can flip the mode while the app is running without restarting it. The `mysql2` package is installed but unused. There are no Docker files included.

## Setup

First, install Node.js 20. Then clone the repository and install the dependencies.

```bash
npm install
```

Copy the example environment file.

```bash
cp .env.example .env
```

Start the development server.

```bash
npm run dev
```

Open the app at `http://localhost:3000/login.html`.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Runs the server with Node. |
| `npm run dev` | Runs the server with Nodemon so it restarts on changes. |
| `npm run build:css` | Watches Tailwind output and rebuilds on changes. |
| `npm run build:css:prod` | Generates minified Tailwind CSS for production. |

## Vulnerability Coverage

| OWASP Risk | Attack Surface |
|---|---|
| A03 Injection (SQLi) | Raw string interpolation in `/login` and all notes routes. |
| A03 Injection (XSS) | Raw note content rendered directly into table cell HTML. |
| A07 Identification Failures | Seeded admin credential stored in plain text. |

## API Behaviour

The vulnerable routes rely on raw string interpolation. 

The `POST /login` route builds a query like this:
```sql
SELECT * FROM users WHERE username = '${username}' AND password='${password}'
```
You can bypass it by entering `' OR '1'='1' --` as the password.

The `GET /notes/search` route searches notes using this query:
```sql
SELECT id, title, content FROM notes WHERE user_id = ${userId} AND title LIKE '%${q}%'
```
You can extract user credentials with a UNION payload like `q=' UNION SELECT username, password, 1 FROM users --`.

The `POST /notes` route inserts raw titles and content directly into the database. You can trigger a stored XSS attack by saving `<script>alert('Vault Breached')</script>` as the note content.

The `GET /notes` and `DELETE /notes/:id` routes also use interpolated IDs in their queries, making them vulnerable to SQL injection.

## Key Files

| File | Purpose |
|---|---|
| `server.js` | Bootstraps Express, creates the schema, and seeds the admin account. |
| `db.js` | Handles the SQLite connection and Promise wrappers. |
| `routes/auth.js` | Contains the vulnerable login route and the secure registration and login routes. |
| `routes/notes.js` | Contains the vulnerable and secure CRUD and search routes for notes. |
| `routes/observability.js` | Serves `GET /stats` and `GET /last-query`. |
| `routes/config.js` | Handles configuration and the mode toggle. |
| `public/login.html` | The login page, which includes secure registration and the mode toggle. |
| `public/notes.html` | The notes UI. It includes payload chips, live stats cards, a last-query panel, and rendering logic that respects the current security mode. |

## Secure Mode

Flipping the app to secure mode via `POST /toggle-mode` switches how the app handles data. SQL queries move to parameterized placeholders. Passwords are verified against bcrypt hashes instead of plain text. Note content gets sanitized with DOMPurify before storage. The client switches from `innerHTML` to safe text rendering. 

The vulnerable and secure logic live side by side in the same route files. A server-side flag controls which branch executes.

## Verification Checklist

After setting up the app, run through these checks to confirm everything works:

- `npm run dev` starts without errors
- `POST /login` can be bypassed with `' OR '1'='1' --`
- `GET /notes/search` accepts UNION-style injection payloads
- `GET /stats` returns non-zero counters after an attack attempt
- `GET /last-query` shows the last tracked SQL statement
- Stored XSS fires when malicious note content loads
- `POST /toggle-mode` switches the app into secure mode
- Login bypass attempts fail in secure mode
- `POST /register` creates bcrypt-hashed users in secure mode
- Note creation in secure mode sanitizes content and renders it safely
- Git ignores the `.env` file
