# BrokenVault Agent Instructions

## Current Project State
- This repo is a **working vulnerable baseline** for an OWASP demo app.
- Backend is Node.js + Express with **raw SQL** queries.
- Database is **SQLite3** (`database.db`), accessed through `db.js`.
- Frontend uses DaisyUI/Tailwind via CDN in static HTML files.
- `mysql2` is installed but **not currently used** by runtime code.
- `SECURE_MODE` exists in `.env` but is **not yet wired** server-side.
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

## Security Behavior (As Implemented Today)
- `POST /login` is vulnerable to SQL injection via string concatenation.
- `GET /notes/search` is vulnerable to SQL injection via interpolated `q` and `userId`.
- `POST /notes` stores raw content, and notes render with `innerHTML` in table rows.
- Admin user is seeded with plain-text password (`admin` / `password123`).

## Important Files
- `server.js`: App bootstrapping, DB table creation, admin seeding, route mounting.
- `db.js`: SQLite wrapper with Promise helpers (`query`, `runQuery`).
- `routes/auth.js`: Login route with intentionally vulnerable SQL.
- `routes/notes.js`: Notes CRUD/search routes with intentionally vulnerable SQL.
- `public/login.html`: Login screen and sessionStorage user handling.
- `public/notes.html`: Notes list/create/search/delete UI and vulnerable rendering.

## Testing & Verification
- Test endpoints with curl/Postman before touching UI behavior.
- Confirm SQLi payloads work in vulnerable routes (`' OR '1'='1' --`, UNION payloads).
- Confirm stored XSS executes from notes table rendering.
- Verify `.env` remains gitignored.

## Common Pitfalls
- Assuming secure mode already exists because `SECURE_MODE` is in `.env`.
- Assuming app is on MySQL because `mysql2` is installed.
- Assuming Docker workflows are available in this branch.
- Treating client-side badge text as an actual security control.
