# BrokenVault Agent Instructions

## Project Overview
- BrokenVault is a deliberately insecure notes app for demonstrating OWASP-style vulnerabilities in a controlled environment.
- The app is designed to show both vulnerable and patched behavior side-by-side through a server-side secure mode toggle.
- The main teaching areas currently covered are:
  - SQL injection through raw string-concatenated queries in vulnerable mode
  - Stored XSS through raw HTML storage and unsafe rendering in vulnerable mode
  - Identification/authentication weaknesses through seeded plain-text credentials in vulnerable mode
- Secure mode patches those paths with parameterized queries, bcrypt password verification, DOMPurify sanitization, and safe client rendering.

## Current Project State
- This repo is a **working vulnerable baseline** for an OWASP demo app.
- Backend is Node.js + Express with vulnerable and secure mode branches.
- Database is **SQLite3** (`database.db`), accessed through `db.js`.
- Frontend uses DaisyUI/Tailwind via CDN in static HTML files.
- Demo observability is implemented with payload chips, live stats, and last-query tracking.
- Secure mode is implemented with server-side toggling, bcrypt auth, DOMPurify sanitization, and safe client rendering.
- `mysql2` is installed but **not currently used** by runtime code.
- Docker files are **not present** in the current repo.

## Key Commands
- Development: `npm run dev` (nodemon server.js)
- Production: `npm start`
- CSS dev: `npm run build:css`
- CSS prod: `npm run build:css:prod`

## Environment Notes
- Required for local run: `PORT` (app listens on `process.env.PORT`).
- Present in `.env` for planned migration/compatibility: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SECURE_MODE`.
- Current app behavior is not driven by `DB_*` because SQLite file storage is used.
- `SECURE_MODE` seeds the initial server mode, and `POST /toggle-mode` can change it at runtime.

## Security Behavior (As Implemented Today)
- `POST /login` is vulnerable to SQL injection via string concatenation.
- Notes routes use raw interpolated SQL in `POST /notes`, `GET /notes`, `GET /notes/search`, and `DELETE /notes/:id`.
- `POST /notes` stores raw content, and notes render with `innerHTML` in table rows.
- Admin user is seeded with plain-text password (`admin` / `password123`).
- Secure mode switches login and notes routes to parameterized queries.
- `POST /register` creates bcrypt-hashed users for secure-mode login.
- Secure-mode note creation sanitizes content with DOMPurify, and the notes UI renders with safe text nodes.

## Important Files
- `server.js`: App bootstrapping, DB table creation, admin seeding, route mounting.
- `db.js`: SQLite wrapper with Promise helpers (`query`, `runQuery`).
- `routes/auth.js`: Login/register routes with vulnerable and secure branches.
- `routes/notes.js`: Notes CRUD/search routes with vulnerable and secure branches.
- `routes/observability.js`: Stats and last-query endpoints for demos.
- `routes/config.js`: Secure mode config and toggle endpoints.
- `utils/attack-signals.js`: Heuristics for SQLi/XSS event logging.
- `utils/mode.js`: In-memory secure/vulnerable mode state.
- `public/login.html`: Login screen, secure registration, and mode toggle.
- `public/notes.html`: Notes UI, payload chips, stats, query log, and mode-aware rendering.

## Testing & Verification
- Test endpoints with curl/Postman before touching UI behavior.
- Confirm SQLi payloads work in vulnerable routes (`' OR '1'='1' --`, UNION payloads).
- Confirm `GET /stats` increments after attack attempts.
- Confirm `GET /last-query` reflects the most recent tracked SQL statement.
- Confirm stored XSS executes from notes table rendering.
- Confirm `POST /toggle-mode` flips the app into secure mode and back.
- Confirm secure-mode login bypass payloads fail.
- Confirm secure-mode registered users have bcrypt hashes in `users.password`.
- Confirm secure-mode notes store sanitized content and render without execution.
- Verify `.env` remains gitignored.

## Common Pitfalls
- Assuming app is on MySQL because `mysql2` is installed.
- Assuming Docker workflows are available in this branch.
- Treating client-side badge text as an actual security control.

## Development Conventions
- Vulnerable and secure code paths should coexist in the same route/module when that makes the before/after comparison clearer.
- Raw SQL is intentional in this repo; do not introduce an ORM.
- Keep the app demo-friendly: attacks should remain visible in vulnerable mode, and secure mode should clearly block the same payloads.
- When code and docs diverge, update the docs immediately so this file, `PLAN.md`, and `README.md` stay aligned.
