# The Broken Vault - Project Plan (Current Repo)

This document reflects the **actual state of this repository today** and defines the next implementation phases.

The app is intentionally vulnerable and used for OWASP demonstrations.

## 1) Reality Snapshot

### Stack in this branch
- Backend: Node.js + Express
- Database: SQLite3 file (`database.db`) via `db.js`
- Frontend: static HTML + DaisyUI/Tailwind via CDN
- Runtime mode: vulnerable baseline (secure mode not implemented yet)

### Not currently implemented
- Server-side secure mode toggle (`/toggle-mode`, `/config`)
- Secure route branches (parameterized SQL + bcrypt + DOMPurify)
- Docker files (`Dockerfile`, `docker-compose.yml`)
- MySQL runtime usage (even though `mysql2` is in dependencies)

## 2) Current Vulnerability Scope (Implemented)

| OWASP Risk | Current attack surface | Status |
|---|---|---|
| A03 - Injection (SQLi) | Raw string interpolation in `/login` and `/notes/search` | Implemented (vulnerable) |
| A03 - Injection (XSS) | Raw note content rendered directly in table cell HTML | Implemented (vulnerable) |
| A07 - Identification Failures | Seeded admin credential stored in plain text | Implemented (vulnerable) |

## 3) Current File Map

- `server.js`
  - Express setup
  - Creates `users`, `notes`, `audit_log` tables in SQLite
  - Seeds admin user (`admin` / `password123`) if missing
  - Mounts routes + serves `public/`
- `db.js`
  - SQLite connection
  - Promise helpers: `query(sql, params)` and `runQuery(sql, params)`
- `routes/auth.js`
  - `POST /login` with vulnerable SQL string concatenation
- `routes/notes.js`
  - `POST /notes`, `GET /notes`, `GET /notes/search`, `DELETE /notes/:id`
  - Vulnerable SQL usage in create/list/search/delete
- `public/login.html`
  - Login form, stores `userId` in `sessionStorage`
- `public/notes.html`
  - Notes table + create/search/delete interactions
  - Content rendered through `innerHTML` in row template

## 4) Local Runbook (Current)

1. Install dependencies:

```bash
npm install
```

2. Ensure `.env` exists (at minimum `PORT=3000`).

3. Start in development:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000/login.html
```

## 5) Current API Behavior (As-Is)

### `POST /login`
- Vulnerable query style:
  - `SELECT * FROM users WHERE username = '${username}' AND password='${password}'`
- SQLi payload example:
  - Password: `' OR '1'='1' --`

### `GET /notes/search?userId=&q=`
- Vulnerable query style:
  - `SELECT id, title, content FROM notes WHERE user_id = ${userId} AND title LIKE '%${q}%'`
- UNION payload example:
  - `q=' UNION SELECT username, password, 1 FROM users --`

### `POST /notes`
- Inserts raw `title` and `content` into DB
- Stored XSS payload example:
  - `<script>alert('Vault Breached')</script>`

### `GET /notes`
- Returns all notes by `user_id`

### `DELETE /notes/:id`
- Deletes by interpolated ID

## 6) Known Gaps vs Intended Full Demo

These features are referenced in older planning docs but are not yet present in code:

1. Exploit Console payload chips in the UI
2. Query Log panel + backend `GET /last-query`
3. Stats endpoints wired to real `audit_log` counts (`GET /stats`)
4. Secure mode branch logic for every vulnerable route
5. Password hashing flow (`/register`, bcrypt login verification)
6. Server-side sanitization path (`isomorphic-dompurify` + safe render)
7. Docker portability files and workflow

## 7) Forward Plan (Updated)

## Phase 1 - Vulnerable Baseline (Done)
- Raw SQL injection surfaces implemented for login/search.
- Stored XSS path implemented (raw store + unsafe render).
- Plain-text seed credential present for demonstration.

## Phase 2 - Demo Observability (Next)
Goal: make attacks obvious in live demos.

Deliverables:
- Add payload chip panel in `public/notes.html`
- Add `lastQuery` capture + `GET /last-query`
- Insert meaningful events into `audit_log`
- Add `GET /stats` and wire stat cards to live values

Acceptance checks:
- Clicking chips auto-fills attack inputs
- Query log shows raw SQL string from most recent route
- Stats cards change after attack attempts

## Phase 3 - Security Patch Mode (Planned)
Goal: keep vulnerable and secure behavior side-by-side, controlled server-side.

Deliverables:
- Add server-side mode flag and `POST /toggle-mode`
- Add `GET /config` for frontend mode awareness
- Convert secure branches to parameterized SQLite queries (`?` placeholders)
- Add bcrypt registration/login verification
- Add DOMPurify sanitization for note content in secure mode
- Switch client rendering to safe text rendering in secure mode

Acceptance checks:
- SQLi payloads fail in secure mode
- Stored XSS payload does not execute in secure mode
- User passwords in DB are bcrypt hashes in secure mode flow

## Phase 4 - Optional Migration + Containerization (Later)
Goal: improve portability and align with MySQL-specific teaching scripts.

Deliverables:
- Introduce `Dockerfile` + `docker-compose.yml`
- Decide whether to remain SQLite-in-container or migrate runtime to MySQL
- If migrating to MySQL, update `db.js`, schema bootstrapping, and docs together

Acceptance checks:
- One command boot (`docker compose up --build`) succeeds from clean clone
- Documentation exactly matches chosen runtime database

## 8) Documentation Rule for This Repo

When code and docs diverge, update docs immediately.

At any point, `PLAN.md` and `AGENTS.md` must agree on:
- active database driver,
- whether secure mode is implemented,
- whether Docker files exist,
- which commands are truly runnable.

## 9) Quick Verification Checklist

- `npm run dev` starts server without errors.
- `POST /login` can be bypassed with `' OR '1'='1' --`.
- `GET /notes/search` accepts UNION-style injection payloads.
- Stored XSS executes when malicious note content is rendered.
- `.env` remains ignored by git.

---

Use this plan as the source of truth for this branch until the next feature phase is implemented.
