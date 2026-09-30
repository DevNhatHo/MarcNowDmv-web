# Local frontend runbook

## Current state

`/trains` and `/trains/[id]` read the local backend through the same-origin proxy and need it running with `.env.local` in place. `/` and `/alerts` are still placeholders owned by WEB-009 and WEB-008, and the map remains future work.

Frontend: `/home/nhat/marc-now-dmv-web`, URL `http://localhost:3000`.
Backend: existing `/home/nhat/MarcNowDmv` (logical name `marc-now-dmv-backend`), future URL `http://localhost:8080`. Do not rename or modify it for frontend work.

## Start and check the app

1. Use Node 24 LTS and npm 11 (verified Node 24.13.0, npm 11.6.2). The framework minimum is Node 20.9; the repository's development dependencies may require a newer version, so use the verified Node 24 environment.
2. Run `npm ci` from the frontend repository. The lockfile pins all dependencies.
3. Run `npm run dev`, then open http://localhost:3000. Port 3000 is explicit; if busy, stop your earlier frontend server rather than silently switching ports.
4. Run `npm test` (non-watch Vitest, collecting `tests/**/*.test.ts` and `.test.tsx`), `npm run lint` (ESLint CLI, zero warnings), `npm run typecheck` (Next route type generation, then strict TypeScript), and `npm run build` (production build). Avoid running build concurrently with the development server.
5. For production preview, stop development, run `npm run build`, then `npm start`; open the same local URL. Stop your foreground server with Ctrl-C.
6. Run `npm run e2e` (Playwright) for the rendered browser checks. It builds and starts the
   production server itself and drives the **installed system Chrome** through the `chrome`
   channel, so no browser binary is downloaded; a machine without Chrome must install it
   rather than fetch Playwright's bundled browsers. Specs live in `tests/e2e/*.spec.ts` and
   run at both required viewports, 360×800 and 1280×900. Vitest never collects them, and
   Playwright never collects Vitest's `*.test.ts(x)` files. Stop any server you started by
   hand first, or the runner will reuse it.

Unit tests assert the shell's landmarks, navigation, current-destination marking and the verbatim independence footer, plus the API boundary's contract parsing. Browser review evidence belongs in `docs/reviews/<ticket>/`. WEB-004 established the permanent Playwright suite; WEB-001 had used temporary tooling for its rendered review.

## Backend integration (implemented by WEB-003)

Copy `.env.example` to `.env.local` before using the proxy. Keep `API_BASE_URL=http://localhost:8080` server-side and `NEXT_PUBLIC_API_BASE_URL=/api/backend` relative. Restart Next after environment changes; never commit `.env.local` or credentials. `API_BASE_URL` is read by the proxy route handler and defaults to
`http://localhost:8080` when unset; `NEXT_PUBLIC_API_BASE_URL` is the relative base the
typed client requests and defaults to `/api/backend`. Neither the backend origin nor any
database setting reaches the browser bundle.

The proxy serves `GET`/`HEAD` on `/api/backend/<upstream path>`, forwarding only `/health`,
`/api/v1/routes`, `/api/v1/stops`, `/api/v1/trains`, `/api/v1/trains/{id}` and
`/api/v1/alerts`. Anything else returns 404 without contacting the backend, any other method
returns 405, a timeout returns 504 `upstream_timeout`, an unreachable backend returns 502
`upstream_unavailable` and a cancelled request returns 499. Upstream status and JSON are
otherwise unchanged.

Start the existing backend following its own docs/RUNBOOK.md with its DATABASE_URL and HTTP_ADDR. This frontend does not own migrations/ingestion; never drop or reseed user databases for a smoke test. Check backend `/health`, then the frontend train routes once implemented. Health does not prove fresh feeds: inspect sourceHealth and timestamps. The retained planning database was `marc_208_live`.

To repeat the WEB-003 live smoke check: start the backend against a retained database
(`DATABASE_URL=...marc_208_live HTTP_ADDR=127.0.0.1:8080 go run ./cmd/api` from the backend
repository), run `npm start` here, then compare `curl http://127.0.0.1:8080/<path>` with
`curl http://localhost:3000/api/backend/<path>`. Only `evaluatedAt` may differ, because it
is the read clock. Never ingest feeds or change schema for a smoke test, and stop both
servers afterwards. A live check is deliberately not part of `npm test`, which must stay
deterministic; write any live probe as a temporary test file and delete it after the run.

Each completed ticket records actual commands/results and visual limitations. Tests use deterministic data; live backend smoke remains separate. No Go checks are required for this frontend-only ticket; backend changes require separately authorized work and backend checks.

## Contract reproduction

`docs/contract-samples/manifest.json` identifies the planning capture origin, backend commit, database and requested paths/statuses. JSON files wrap raw bodies and selected response headers. They are retained-data samples, not freshness promises. Use actual returned train IDs for new smoke runs rather than assuming sample IDs still exist. Validate list, detail, alerts, health, nulls and stale evidence. Synthetic MOVING/STATIONARY/trend samples must be explicitly labeled.

For pagination use the actual response tokens; detail query keys are `afterStop` and `afterUpdate`. A 409 requires a bounded fresh restart. Do not combine schedule versions or treat partial lists as complete totals.

## Manual design review

Inspect 360×800 mobile and 1280×900 desktop; also test keyboard-only navigation, 200% zoom, reduced motion, long trip identifiers and alert text. Review loading/empty/error/real-data states, provenance and unknown/stale contrast. Record screenshots under a documented review location when available; do not commit generated browser reports or secrets. Use docs/DESIGN.md's checklist. Missing browser tooling is an incomplete visual check, not a pass.

## Git

One completed implementation ticket per final commit. Check status first and include only its changes. `origin` is `git@github.com:DevNhatHo/MarcNowDmv-web.git`, configured on the user's instruction after WEB-003, and `main` tracks `origin/main`. Push to that existing upstream without force; preserve local commits on failure. Do not add another remote without a request.

## Future map checks

WEB-MAP-1 records chosen stable Leaflet version/license and provider decision; default plan has no external tile service or API key. Do not configure paid tiles implicitly. WEB-MAP-2 adds actual geometry endpoints to the proxy only after backend contract delivery. Extend existing smoke tests in WEB-MAP-5 to cover system→focus→detail→system, current versus last-known markers, missing positions, stale follow pause and bounded requests. Use actual local backend responses plus clearly synthetic fresh-state fixtures; no runtime or visual map check was executed during planning.

## WEB-001 toolchain compatibility

Pinned Next.js 16.3.7, React/React DOM 19.3.0, TypeScript 6.0.3, Vitest 5.0.2 and ESLint 9.39.5 (full exact dependency list in package.json). The project requires Node >=24 and was checked with Node 24.13.0/npm 11.6.2.

ESLint 9 emits an upstream deprecation notice. ESLint 10.11.0 was tested but Next's bundled React/import/accessibility plugins have incompatible peer ranges and its React lint rule crashed. Keep 9.39.5 until that plugin chain supports 10; do not force incompatible peer dependencies. Vitest 5 uses its current default JSX transformation; no obsolete esbuild JSX option is set. The initial lint/type/build failures were fixed before the final checks.

`next-env.d.ts` and `.next/` are generated and ignored. `npm run typecheck` generates the needed Next types, so type checking does not depend on a previous build.

Next's dev agent-file generator is disabled with `agentRules: false` in next.config.ts so starting the app preserves repository-owned AGENTS.md. Both dev and production startup were verified in WEB-001; screenshots and observations are in [the review record](reviews/WEB-001/README.md).
