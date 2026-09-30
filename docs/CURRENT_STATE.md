# Frontend current state

Updated: 2026-09-29 (America/New_York).

## Milestone and work status

Local frontend core milestone has begun. [WEB-001](tickets/WEB-001.md) is DONE: Next.js 16.3.7 / React 19.3.0 App Router starter, strict TypeScript, pinned npm lockfile and repeatable checks. Only `/` exists; it honestly says live service information is not yet available. Current ticket: none. Completed: WEB-001. Recommended next: [WEB-002 — Design tokens and visual foundation](tickets/WEB-002.md). WEB-002–012 and WEB-MAP-1–5 remain NOT_STARTED. This session stopped after WEB-001.

Repository: `/home/nhat/marc-now-dmv-web`, main branch. No remote configured; no push target exists. Backend `/home/nhat/MarcNowDmv` was unchanged; unrelated `.idea/` remains untouched. Backend, API integration, full shell, map and AWS were outside WEB-001.

## Backend dependency and actual observations

Backend main at `ade2f9e` (`feat(MARC-505): expose observed movement alongside official status`), tracking origin/main. MARC-500–505 are already complete. Read-only local API inspection used existing PostGIS database `marc_208_live` with migrations 1–11 applied and active official schedule. No database ingestion or schema changes were made.

Actual HTTP captures on 2026-09-29: health, routes, stops, train list, retained prior-service-date list, detail and alerts returned 200; invalid limit and wrong detail cursor returned 400; unsupported route-detail path returned 404; correct `afterStop` returned 200; HEAD health returned 200 with no body. Capture manifest and bodies are in [contract-samples](contract-samples/manifest.json). Prior-service-date list had 96 trains, five with retained official observations; alert response had four retained MARC advisories. These are not fresh-service assertions. No fresh MOVING/STATIONARY example was observed; future deterministic fixtures must label synthetic states.

## Known gaps and decisions

See [verified contract](API_CONTRACT.md) and [backend proposals](BACKEND_GAPS.md). List is a full service-date schedule, with no movement summaries or commuter train-number/direction fields. No route geometry endpoint exists. Detail calculations are top-level; cursor documentation differs from handlers. Preserve independent delay-trend freshness. Use a same-origin frontend proxy because inspected responses lacked CORS headers. No backend changes or AWS work is authorized by this plan.

## Checks and visual status

Executed successfully for final WEB-001 code: clean `npm ci`; `npm test` (2 tests); `npm run lint` (zero warnings); `npm run typecheck`; `npm run build`. Dev and production preview each served HTTP 200 on localhost:3000. npm install/ci reported zero vulnerabilities. Node 24.13.0/npm 11.6.2 verified; project requires Node >=24. Runtime checks did not require Go/backend access.

Rendered and visually inspected mobile 360×800 and desktop 1280×900 using installed Chrome via temporary Playwright tooling; no horizontal overflow, correct title/language/main heading, no uncaught page errors. Screenshots and limitations: [WEB-001 review](reviews/WEB-001/README.md). Loading/error/empty/real-data states are not applicable to this static starter. Design tokens, full accessibility audit and future screen reviews remain outstanding in their tickets.

Initial lint/type/build failures were corrected. ESLint 10 was incompatible with Next's bundled plugins; compatible 9.39.5 is pinned but emits an upstream deprecation notice. Revisit when plugin compatibility permits an upgrade. Next's automatic agent-file generation is disabled to preserve repository instructions. Go tests/vet/build were NOT RUN: backend unchanged.

## Map roadmap remains planned

System map/focus follow WEB-012 through WEB-MAP-1–5. Client-only Leaflet and canonical backend geometry remain the recommendation; geometry and active-membership APIs are explicit backend proposal gates. No map dependencies were installed. See [map plan](MAP_PLAN.md).

## Next session

Read AGENTS.md, architecture/design/API contract and WEB-002. Check git status, mark WEB-002 IN_PROGRESS, and implement only the token/visual foundation scope. Preserve the starter and existing docs. Use `npm ci`, `npm run dev`, and the established checks; capture rendered mobile/desktop evidence for visual changes. Do not skip ahead to API integration or map work.
