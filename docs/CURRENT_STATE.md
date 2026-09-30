# Frontend current state

Updated: 2026-09-29 (America/New_York).

## Milestone and work status

[WEB-001](tickets/WEB-001.md) through [WEB-004](tickets/WEB-004.md) are DONE. The Next.js starter has shared design tokens, readable responsive typography, focus/reduced-motion defaults and a native preview disclosure, and now a complete typed API boundary with a same-origin backend proxy. `/`, `/trains` and `/alerts` exist inside a responsive shell, but each is an honest placeholder; no screen consumes the API client yet, so live data is still not presented anywhere. Current ticket: none. Recommended next: [WEB-005 — service-date train list](tickets/WEB-005.md). WEB-005–012 and WEB-MAP-1–5 remain NOT_STARTED. This session stopped after WEB-004.

Repository: `/home/nhat/marc-now-dmv-web`, main branch tracking `origin/main` at `git@github.com:DevNhatHo/MarcNowDmv-web.git`, configured on the user's instruction after WEB-003 and pushed through `c6b3006`. Earlier ticket records state that no remote existed, which was true when they were written. Backend `/home/nhat/MarcNowDmv` was unchanged; unrelated `.idea/` remains untouched. The backend, the full shell, the map and AWS remain outside WEB-001–003; API integration is now implemented as a boundary only, with no screen consuming it.

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

## WEB-003 boundary as implemented

`lib/types/*` carries the wire contract and `lib/api/*` the boundary: guard primitives, one
parser per response, a closed set of typed failures, one request function, resource modules
for trains/alerts/catalogs/health, bounded continuation and the path allowlist shared with
the proxy at `app/api/backend/[...path]/route.ts`. Structure is validated strictly; enum
vocabulary is never rejected, so an unrecognized backend state degrades to unknown instead
of breaking a screen. Timestamps stay ISO strings and every identifier stays a string.

Wire types were derived from the handler DTOs rather than from prose, correcting six field
types the captures could not reveal — most importantly that `scheduleRelationship` is a
nullable **number** and that `officialStopUpdates[].stopId`/`.resolvedSequence` are
**nullable**. Cursor prerequisites were read from the query parsers: trains need
`serviceDate`+`version`, alerts need `snapshot`+`version`, and detail accepts no `version`.
The client refuses those combinations locally as typed `usage` failures. Full table in
[API_CONTRACT.md](API_CONTRACT.md); a new BACKEND-UI-05 proposal is recorded in
[BACKEND_GAPS.md](BACKEND_GAPS.md). No backend file was changed.

Two defects surfaced from the tests, not from review: resource readers threw usage errors
synchronously instead of rejecting, and the continuation walk issued a page request before
checking its own bound, discarding it and leaving an unawaited promise. Both are fixed.

Checks executed for WEB-003: `npm test` (5 files, **64 tests**, 0 failures), `npm run lint`
(zero warnings), `npm run typecheck`, `npm run build` (dynamic route
`/api/backend/[...path]` registered). Manual verification ran the real stack — backend
`cmd/api` on 127.0.0.1:8080 against retained `marc_208_live`, frontend `npm start` on
localhost:3000, no ingestion or schema change. Health, routes and stops were byte-identical
through the proxy and directly; trains and alerts differed only in `evaluatedAt`. Live
`?afterStop=1` and `?afterUpdate=1` returned 200 while `?stopAfter=1` returned 400.
Disallowed paths returned 404 with zero matching backend log entries. Non-GET/HEAD methods
returned 405, HEAD returned a bodyless 200, and every proxy response carried
`Cache-Control: no-store`. The backend sent no `Access-Control-Allow-*` header even for an
`Origin` request, while the proxy is same-origin, so no backend CORS change is required. A
temporary live smoke test, deleted afterwards, parsed today's responses through the typed
client and walked 96 trains over 2 bounded pages with `complete: true` and no duplicate
identifiers. Both servers were stopped.

Limitations: no fresh MOVING/STATIONARY/MEASURED or non-UNKNOWN trend response exists in
the retained data, so those branches rest on fixtures that are labelled SYNTHETIC in the
file, in every export name and in their comments. No browser was driven, because this
ticket adds no UI that loads the client; the same-origin property was verified over HTTP
instead, and a real browser check belongs with the first screen that consumes the client.
Design verification is not applicable. `npm test` now also collects `tests/**/*.test.ts`;
the command is unchanged. Go checks were NOT RUN: the backend is untouched.

## WEB-004 shell as implemented

`components/AppShell` provides the skip link, header, one main landmark and the verbatim
independence footer; `SiteNavigation` is the only Client Component, because only it needs
the current path. `RoutePlaceholder` carries the honest not-built-yet messaging on `/`,
`/trains` and `/alerts`. The current destination is marked by colour, weight and a
persistent underline together plus `aria-current`, so it survives grayscale. Placeholders
contain no figures at all, and each states that an empty screen is not an operational
claim.

Playwright now drives the installed system Chrome through the `chrome` channel at 360×800
and 1280×900; no browser binary is downloaded. `npm run e2e` builds and starts the
production server itself.

Checks executed for WEB-004: `npm test` (5 files, **74 tests**), `npm run lint` (zero
warnings), `npm run typecheck`, `npm run build` (`/`, `/trains`, `/alerts` static;
`/api/backend/[...path]` dynamic) and `npx playwright test` (**12 tests, 6 per viewport**).
Measured from the live DOM at both viewports: 0 px horizontal overflow, 44 px navigation
targets, one `h1` per page, 960 px capped desktop content, a 3 px skip-link focus ring and
`--motion-duration` of 0s under reduced motion. Fourteen screenshots and the full design
checklist are in [the review record](reviews/WEB-004/README.md).

Two defects were found and fixed. Next's `title.template` applies to **child** segments
only, so the root page rendered a bare `Pulse` while the others rendered the full template;
it now sets its title absolutely. Separately, navigation labels broke **mid-word** at 200%
zoom on a 360 px viewport because WEB-002's global `overflow-wrap: anywhere` is wrong for a
short label — every automated check passed while this was broken, and only the rendered
review caught it.

Limitations: loading, error and real-data states are not applicable, because the shell
performs no fetch. The real browser check of the WEB-003 client is still owed and belongs
to WEB-005, the first screen that calls it. Chrome only; no full accessibility audit.

## Next session

Read AGENTS.md, architecture/design/API contract and WEB-005. Inspect status, verify the WEB-003 and WEB-004 dependencies are complete, mark WEB-005 IN_PROGRESS and implement only the service-date train list. Use the WEB-003 client rather than fetching directly, reuse the WEB-004 shell and the WEB-002 tokens, and keep the list bounded: it must not request detail per row. WEB-005 is a visual ticket, so rendered mobile and desktop review of the loading, empty, error and real-data states is required and automated tests alone cannot complete it; it is also where the owed real browser check of the same-origin client belongs. Preserve the existing backend; no map work is authorized.
