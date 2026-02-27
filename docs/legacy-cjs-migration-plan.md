# Legacy CommonJS → TypeScript Migration Plan (Incremental)

## Goal
Reduce runtime `require(...)` + `app.locals` coupling in backend routes by migrating remaining CommonJS route modules to typed TS routers with clean dependency injection.

## Current Legacy Surface
Remaining CommonJS modules used by the backend server path:

- `backend/routes/docs.js`
- `backend/routes/tasks.archive.js`
- `backend/utils/auth.js`

Current bridge point:

- `backend/src/presentation/http/routes/index.ts` still loads legacy routers via `require(...)`.

## Migration Principles

1. **No big-bang rewrite**
   - Migrate one module at a time.
   - Keep behavior parity first, improve ergonomics second.

2. **Route-level parity tests before/after**
   - Add or preserve tests around current behavior before replacing route wiring.
   - Migrate wiring only after tests pass.

3. **Dependency injection over `app.locals`**
   - New TS routers should receive explicit dependencies (`db`, `broadcast`, util fns).
   - Avoid hidden global access patterns.

4. **Small PR-sized slices**
   - Each step should be reviewable and revertible independently.

## Proposed Execution Order

### Step 1 — Migrate `tasks.archive.js` first (lowest risk)
Why first:
- Single endpoint (`POST /api/tasks/archive_done`)
- Clear behavior and narrow SQL surface

Deliverables:
- Create `backend/src/presentation/http/routes/tasksArchiveRouter.ts`
- Inject `db` + `broadcast`
- Register with TS import in `routes/index.ts`
- Remove legacy `require('../../../../routes/tasks.archive')`

Verification:
- Existing tasks route tests still pass (`archive_done` behavior)

---

### Step 2 — Migrate `docs.js` (moderate)
Why second:
- Larger route surface (`/`, `/sync`, `/resync`, `/stats`)
- Uses `syncDocs` utility + dynamic query options

Deliverables:
- Create `backend/src/presentation/http/routes/docsRouter.ts`
- Add safe query validation for `limit`/`git_status`
- Inject `db`, `broadcast`, and optional `syncDocs` override
- Replace legacy `require('../../../../routes/docs')`

Verification:
- `backend/test/routes/docsRouter.test.ts` passes
- Manual smoke: `/api/docs`, `/api/docs/stats`, `/api/docs/resync`

---

### Step 3 — Migrate auth utility to TS and remove CJS require in `server.ts`
Why last:
- Affects HTTP + WS auth path
- Broad blast radius compared to route modules

Deliverables:
- Create `backend/src/presentation/http/middleware/auth.ts`
- Export typed `requireApiKey`, `isRequestAuthorized`, `extractProvidedKey`
- Replace `require('./utils/auth')` in `backend/server.ts` with TS import
- Keep legacy `backend/utils/auth.js` shim temporarily if needed, then remove

Verification:
- `backend/test/middleware/auth.test.ts` passes
- WS handshake auth still works with `Authorization`, `x-api-key`, query key

## Rollback Strategy

- Keep each migration in its own commit.
- If behavior drift appears, revert only the affected step commit.
- Preserve previous route tests to quickly identify regressions.

## Definition of Done

- No `require(...)` usage for route registration in `src/presentation/http/routes/index.ts`
- No runtime dependency on `backend/routes/*.js`
- Auth import in `server.ts` is TS-native (no CJS `require`)
- Full backend test suite green
