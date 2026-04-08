# BrokenVault

BrokenVault is a deliberately insecure OWASP demo app built with Node.js, Express, SQLite, and static HTML pages styled with DaisyUI/Tailwind.

## Current Stack

- Backend: Node.js + Express
- Database: SQLite via `database.db`
- Frontend: static HTML in `public/`
- Runtime mode: vulnerable and secure modes with observability

Notes for this branch:

- `SECURE_MODE` controls the initial runtime mode and can be toggled server-side while the app is running.
- `mysql2` is installed but is not used by runtime code.
- Docker files are not present in this repo.
- The notes page includes payload chips, live stats, a last-query panel, and secure-mode safe rendering.

## Local Setup

1. Install Node.js 20.
2. Install dependencies:

```bash
npm install
```

3. Create your local env file:

```bash
cp .env.example .env
```

4. Start the app in development:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000/login.html
```

## Available Scripts

- `npm start` - run the server with Node
- `npm run dev` - run the server with Nodemon
- `npm run build:css` - watch Tailwind CSS output
- `npm run build:css:prod` - generate minified Tailwind CSS

## Important Files

- `server.js` - Express bootstrapping, schema creation, admin seeding
- `db.js` - SQLite connection and Promise wrappers
- `routes/auth.js` - vulnerable login plus secure registration/login routes
- `routes/notes.js` - vulnerable and secure notes CRUD/search routes
- `routes/config.js` - config and mode toggle endpoints
- `public/login.html` - login page plus secure registration
- `public/notes.html` - notes UI with observability and mode-aware rendering

## Verification

After setup, check that:

- `npm run dev` starts without errors
- `POST /login` can be bypassed with `' OR '1'='1' --`
- `GET /notes/search` accepts UNION-style injection payloads
- `GET /stats` returns non-zero counters after attack attempts
- `GET /last-query` shows the most recent tracked SQL statement
- stored XSS executes when malicious note content is rendered
- `POST /toggle-mode` flips the app into secure mode
- secure-mode login bypass attempts fail
- `POST /register` creates bcrypt-hashed users in secure mode
- the app loads at `/login.html`

## Security Warning

This project is intentionally insecure for learning and demo purposes. Do not deploy it as-is to any real environment.
