# Local frontend runbook

## Current state

This checkout is documentation only. There is no package.json, npm script, Next server or frontend test suite yet. The commands below are the intended WEB-001+ workflow, not commands executed successfully in planning. No AWS configuration is required or planned.

Frontend: `/home/nhat/marc-now-dmv-web`, expected URL `http://localhost:3000`.
Backend: existing `/home/nhat/MarcNowDmv` (logical name `marc-now-dmv-backend`), expected URL `http://localhost:8080`. Do not rename or modify it for frontend work.

## After WEB-001

1. Check the installed Node/npm versions against the stable Next.js installation requirements. WEB-001 records exact dependency versions in package.json/lockfile and creates test, lint, typecheck and build scripts.
2. Run `npm ci` from the frontend repository after a lockfile exists.
3. Copy `.env.example` to `.env.local`. Keep `API_BASE_URL=http://localhost:8080` server-side and `NEXT_PUBLIC_API_BASE_URL=/api/backend` relative. Restart the dev server after environment changes. Never commit `.env.local` or credentials.
4. Start the existing backend following its own docs/RUNBOOK.md and configured PostGIS database. Use `go run ./cmd/api` with its DATABASE_URL and HTTP_ADDR supplied locally; this frontend does not own migrations or ingestion. Existing planning database was `marc_208_live`. Do not drop, reseed or migrate user databases merely to view the frontend.
5. Run `npm run dev` for port 3000. The proxy becomes available only after WEB-003.
6. Verify `/health` on the backend and visit `/trains`, then open a returned train ID. Health alone does not prove feeds are fresh. Inspect sourceHealth and evidence timestamps. Retained data can legitimately be UNKNOWN/UNAVAILABLE.

## Planned checks

WEB-001 must establish executable scripts: `npm test` (non-watch), `npm run lint`, `npm run typecheck`, `npm run build`. Use the stable Next-compatible ESLint CLI rather than assuming a removed framework lint command. Appropriate initial smoke tests should exercise the initial page, not duplicate configuration. Add `npm run test:e2e` with Playwright when the first navigation/screen work needs it; document browser installation then. Do not claim these commands passed before they exist and run.

Each completed ticket records commands, exit results, rendered reviews and limitations. Network-independent fixtures are required for regular tests. Local smoke against the real backend is separate and cannot require fresh live MTA data for every test run. No Go checks are required for documentation-only/frontend-only changes; backend modifications would require a separately authorized backend task and its checks.

## Contract reproduction

`docs/contract-samples/manifest.json` identifies the planning capture origin, backend commit, database and requested paths/statuses. JSON files wrap raw bodies and selected response headers. They are retained-data samples, not freshness promises. Use actual returned train IDs for new smoke runs rather than assuming sample IDs still exist. Validate list, detail, alerts, health, nulls and stale evidence. Synthetic MOVING/STATIONARY/trend samples must be explicitly labeled.

For pagination use the actual response tokens; detail query keys are `afterStop` and `afterUpdate`. A 409 requires a bounded fresh restart. Do not combine schedule versions or treat partial lists as complete totals.

## Manual design review

Inspect 360×800 mobile and 1280×900 desktop; also test keyboard-only navigation, 200% zoom, reduced motion, long trip identifiers and alert text. Review loading/empty/error/real-data states, provenance and unknown/stale contrast. Record screenshots under a documented review location when available; do not commit generated browser reports or secrets. Use docs/DESIGN.md's checklist. Missing browser tooling is an incomplete visual check, not a pass.

## Git

One completed implementation ticket per final commit. Check status first and include only its changes. This newly initialized repository has no remote configured. Do not invent an origin URL or create a remote repository without a request. If later configured, push to the existing upstream without force; preserve local commits on failure.

## Future map checks

WEB-MAP-1 records chosen stable Leaflet version/license and provider decision; default plan has no external tile service or API key. Do not configure paid tiles implicitly. WEB-MAP-2 adds actual geometry endpoints to the proxy only after backend contract delivery. Extend existing smoke tests in WEB-MAP-5 to cover system→focus→detail→system, current versus last-known markers, missing positions, stale follow pause and bounded requests. Use actual local backend responses plus clearly synthetic fresh-state fixtures; no runtime or visual map check was executed during planning.
