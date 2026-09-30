# Frontend current state

Updated: 2026-09-29 (America/New_York).

## Milestone and work status

[WEB-001](tickets/WEB-001.md) and [WEB-002](tickets/WEB-002.md) are DONE. The Next.js starter now has shared design tokens, readable responsive typography, focus/reduced-motion defaults and a native preview disclosure. Only `/` exists; live data remains unavailable. Current ticket: none. Recommended next: [WEB-003 — Typed API client and local proxy](tickets/WEB-003.md). WEB-003–012 and WEB-MAP-1–5 remain NOT_STARTED. This session stopped after WEB-002.

Repository: `/home/nhat/marc-now-dmv-web`, main branch. No remote configured; no push target exists. Backend `/home/nhat/MarcNowDmv` was unchanged; unrelated `.idea/` remains untouched. Backend, API integration, full shell, map and AWS were outside WEB-001/002.

## Backend dependency and actual observations

Backend main at `ade2f9e` (`feat(MARC-505): expose observed movement alongside official status`), tracking origin/main. MARC-500–505 are already complete. Read-only local API inspection used existing PostGIS database `marc_208_live` with migrations 1–11 applied and active official schedule. No database ingestion or schema changes were made.

Actual HTTP captures on 2026-09-29: health, routes, stops, train list, retained prior-service-date list, detail and alerts returned 200; invalid limit and wrong detail cursor returned 400; unsupported route-detail path returned 404; correct `afterStop` returned 200; HEAD health returned 200 with no body. Capture manifest and bodies are in [contract-samples](contract-samples/manifest.json). Prior-service-date list had 96 trains, five with retained official observations; alert response had four retained MARC advisories. These are not fresh-service assertions. No fresh MOVING/STATIONARY example was observed; future deterministic fixtures must label synthetic states.

## Known gaps and decisions

See [verified contract](API_CONTRACT.md) and [backend proposals](BACKEND_GAPS.md). List is a full service-date schedule, with no movement summaries or commuter train-number/direction fields. No route geometry endpoint exists. Detail calculations are top-level; cursor documentation differs from handlers. Preserve independent delay-trend freshness. Use a same-origin frontend proxy because inspected responses lacked CORS headers. No backend changes or AWS work is authorized by this plan.

## Checks and visual status

Executed successfully for WEB-002: `npm test` (2 tests), `npm run lint` (zero warnings), `npm run typecheck`, `npm run build`. Production app returned HTTP 200 at localhost:3000. No dependencies were changed. Node 24.13.0/npm 11.6.2 remains the verified setup from WEB-001; no npm install/audit was repeated in WEB-002.

Rendered and visually inspected 360×800 mobile and 1280×900 desktop, including keyboard focus/disclosure, 200% CSS-zoom reflow and explicitly synthetic grayscale/long-identifier cases. No horizontal overflow or uncaught page errors. Target 48px, focus outline 3px; Enter/Space and reduced-motion probes passed. Minimum text contrast 6.07:1 on intended backgrounds. [WEB-002 screenshots, measurements and limitations](reviews/WEB-002/README.md). Data lifecycle states are not applicable yet; no full accessibility audit is claimed.

Initial lint/type/build failures were corrected. ESLint 10 was incompatible with Next's bundled plugins; compatible 9.39.5 is pinned but emits an upstream deprecation notice. Revisit when plugin compatibility permits an upgrade. Next's automatic agent-file generation is disabled to preserve repository instructions. Go tests/vet/build were NOT RUN: backend unchanged.

## Map roadmap remains planned

System map/focus follow WEB-012 through WEB-MAP-1–5. Client-only Leaflet and canonical backend geometry remain the recommendation; geometry and active-membership APIs are explicit backend proposal gates. No map dependencies were installed. See [map plan](MAP_PLAN.md).

## Next session

Read AGENTS.md, architecture/design/API contract and WEB-003. Inspect status, verify WEB-001 dependency is complete, mark WEB-003 IN_PROGRESS and implement only the typed API/proxy boundary. Preserve the visual foundation and existing backend. Run established checks and verify actual local contract behavior; no map or product screens belong to WEB-003.
