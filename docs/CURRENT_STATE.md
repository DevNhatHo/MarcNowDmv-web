# Frontend current state

Updated: 2026-09-29.

## Milestone and work status

Local frontend planning/bootstrap documentation is complete. The Next.js app does not exist yet. Current implementation ticket: none. Completed implementation tickets: none. All WEB-001–WEB-012 are NOT_STARTED. Recommended next: [WEB-001 — Bootstrap Next.js/TypeScript project](tickets/WEB-001.md), only in a subsequent authorized implementation session. Stop after planning in this session.

Repository: `/home/nhat/marc-now-dmv-web`, newly initialized main branch, separate from existing backend `/home/nhat/MarcNowDmv`. No remote configured; no push target exists. No backend files were modified. Existing unrelated backend `.idea/` directory was preserved.

## Backend dependency and actual observations

Backend main at `ade2f9e` (`feat(MARC-505): expose observed movement alongside official status`), tracking origin/main. MARC-500–505 are already complete. Read-only local API inspection used existing PostGIS database `marc_208_live` with migrations 1–11 applied and active official schedule. No database ingestion or schema changes were made.

Actual HTTP captures on 2026-09-29: health, routes, stops, train list, retained prior-service-date list, detail and alerts returned 200; invalid limit and wrong detail cursor returned 400; unsupported route-detail path returned 404; correct `afterStop` returned 200; HEAD health returned 200 with no body. Capture manifest and bodies are in [contract-samples](contract-samples/manifest.json). Prior-service-date list had 96 trains, five with retained official observations; alert response had four retained MARC advisories. These are not fresh-service assertions. No fresh MOVING/STATIONARY example was observed; future deterministic fixtures must label synthetic states.

## Known gaps and decisions

See [verified contract](API_CONTRACT.md) and [backend proposals](BACKEND_GAPS.md). List is a full service-date schedule, with no movement summaries or commuter train-number/direction fields. No route geometry endpoint exists. Detail calculations are top-level; cursor documentation differs from handlers. Preserve independent delay-trend freshness. Use a same-origin frontend proxy because inspected responses lacked CORS headers. No backend changes or AWS work is authorized by this plan.

## Checks and visual status

Planning validation: JSON captures parse; all 12 tickets contain required sections and resolvable, acyclic dependencies; local Markdown links and whitespace checks pass. No package.json or implementation files were created. Documentation diff reviewed before planning commit.

Frontend tests/lint/typecheck/build: NOT RUN — app and scripts do not exist. Backend Go tests/vet/build: NOT RUN this planning session — backend unmodified. Actual API requests above were executed. Visual/mobile/desktop/accessibility verification: NOT RUN — no rendered frontend exists. Every future visual ticket includes the rendered verification gate and screenshot recording where possible. Proposed token colors are not yet contrast-certified.

## Next session

Read AGENTS.md, architecture, design, API contract and WEB-001. Inspect status first. Mark WEB-001 IN_PROGRESS, install the current stable stack while preserving these docs, establish executable checks and render the starter page at both target widths. Do not skip to later screens or treat planning as completed implementation.
