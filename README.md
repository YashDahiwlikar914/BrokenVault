# BrokenVault

BrokenVault is a deliberately broken web app. It ships with real, working vulnerabilities so you can study and demo OWASP attack patterns without setting up anything complex.
Built with Node.js, Express, SQLite, and static HTML styled with DaisyUI and Tailwind.

## Stack

- Backend: Node.js + Express
- Database: SQLite via `database.db`
- Frontend: static HTML in `public/`
- Runtime: toggleable between vulnerable and secure mode, with observability built in

## Notes on This Branch

`SECURE_MODE` sets the initial runtime mode. You can flip it while the app is running without restarting. `mysql2` is installed but unused at runtime. No Docker files are included.

## Setup

1. Install Node.js 20.
2. Install dependencies.

```bash
npm install
```

3. Copy the example env file.

```bash
cp .env.example .env
```

4. Start the dev server.

```bash
npm run dev
```

5. Open the app at `http://localhost:3000/login.html`.

## Scripts

- `npm start` runs the server with Node
- `npm run dev` runs the server with Nodemon
- `npm run build:css` watches Tailwind output
- `npm run build:css:prod` generates minified Tailwind CSS

## Vulnerability Coverage

| OWASP Risk | Attack Surface |
|---|---|
| A03 Injection (SQLi) | Raw string interpolation in `/login` and all notes routes |
| A03 Injection (XSS) | Raw note content rendered directly into table cell HTML |
| A07 Identification Failures | Seeded admin credential stored in plain text |

## API Behavior

### `POST /login`

Vulnerable query:
```sql
SELECT * FROM users WHERE username = '${username}' AND password='${password}'
```
SQLi bypass: use `' OR '1'='1' --` as the password.

### `GET /notes/search?userId=&q=`

Vulnerable query:
```sql
SELECT id, title, content FROM notes WHERE user_id = ${userId} AND title LIKE '%${q}%'
```
UNION payload: `q=' UNION SELECT username, password, 1 FROM users --`

### `POST /notes`

Inserts raw `title` and `content` into the DB. Stored XSS payload: `<script>alert('Vault Breached')</script>`

### `GET /notes`

Returns all notes for a `user_id`. Uses interpolated `userId` in the query.

### `DELETE /notes/:id`

Deletes by interpolated ID.

## Key Files

- `server.js` bootstraps Express, creates the schema, and seeds the admin account
- `db.js` handles the SQLite connection and Promise wrappers
- `routes/auth.js` has the vulnerable login route and the secure registration and login routes
- `routes/notes.js` has vulnerable and secure CRUD and search for notes
- `routes/observability.js` serves `GET /stats` and `GET /last-query`
- `routes/config.js` handles config and the mode toggle
- `public/login.html` is the login page, including secure registration and mode toggle
- `public/notes.html` is the notes UI with payload chips, live stats cards, a last-query panel, and mode-aware rendering

## Secure Mode

Flipping to secure mode via `POST /toggle-mode` switches the entire app:

- SQL queries move to parameterized `?` placeholders
- Passwords are verified against bcrypt hashes
- Note content is sanitized with DOMPurify before storage
- Client rendering switches from `innerHTML` to safe text rendering

The vulnerable and secure branches live side by side in the same routes, controlled by the server-side flag.

## Verification Checklist

After setup, confirm the following work:

- `npm run dev` starts without errors
- `POST /login` can be bypassed with `' OR '1'='1' --`
- `GET /notes/search` accepts UNION-style injection payloads
- `GET /stats` returns non-zero counters after attack attempts
- `GET /last-query` shows the last tracked SQL statement
- Stored XSS fires when malicious note content is rendered
- `POST /toggle-mode` switches the app into secure mode
- Login bypass attempts fail in secure mode
- `POST /register` creates bcrypt-hashed users in secure mode
- Secure-mode note creation stores sanitized content and renders it safely
- `.env` is ignored by git

## Warning

This app is intentionally insecure. Do not deploy it to any real environment.
