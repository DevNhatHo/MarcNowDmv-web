# Frontend current state

Updated: 2026-09-30 (America/New_York).

## Milestone and work status

[WEB-001](tickets/WEB-001.md) through [WEB-005](tickets/WEB-005.md), and [WEB-007](tickets/WEB-007.md) through [WEB-012](tickets/WEB-012.md) are DONE. The Next.js starter has shared design tokens, readable responsive typography, focus/reduced-motion defaults and a native preview disclosure, and now a complete typed API boundary with a same-origin backend proxy. Every route is now a real screen reading the local backend through the typed client: `/` (Pulse), `/trains`, `/trains/[id]` and `/alerts`. No placeholder remains. Current ticket: none. **The core local milestone (WEB-001–WEB-012) is complete.** Recommended next: [WEB-MAP-1](tickets/WEB-MAP-1.md), the only map ticket whose dependency is satisfied. WEB-MAP-1–5 remain NOT_STARTED; WEB-MAP-2 and WEB-MAP-3 are gated on the undelivered BACKEND-UI-03 and BACKEND-UI-02 proposals. **WEB-006 was merged into WEB-005** on 2026-09-29: the list's detail links and the detail route cannot ship in separate tickets without leaving every row pointing at a route that does not exist, so one ticket now delivers both surfaces and reviews both. WEB-007 depends on WEB-005 accordingly.

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

## WEB-005 screens as implemented

`/trains` lists the whole scheduled service date with line and date filters held in the URL,
explicit refresh and bounded load-more; `/trains/[id]` shows one train's identity, dominant
official status, location, scheduled stops with separately labelled official estimates, and
a closed Data status disclosure. Presentation helpers live in `lib/presentation/`;
`components/useResource.ts` gives one in-flight request per resource with explicit refresh
only, since WEB-010 owns polling.

Rows are ordered by scheduled departure: the backend paginates by run identity, so live rows
arrived 19:45, 15:40, 06:12, 17:20. Sorting is presentation over published times and infers
nothing, and the partial notice says a later page may insert rows above existing ones.
Catalog names for lines and stops are joined only when schedule versions match.

Checks executed for WEB-005: `npm test` (7 files, **107 tests**), `npm run lint` (zero
warnings), `npm run typecheck`, `npm run build` and `npx playwright test` (12 tests, 6 per
viewport). Manual verification ran against the real backend reading retained
`marc_208_live`, no ingestion, no schema change: load-more completed the service date at
**96 trains ordered 04:50 → 20:05**, the back link restored the filters, an empty date and an
unknown identifier both rendered honest copy, and every live row read "Realtime status
unavailable · No report received" with nothing reading "On time". 0 px overflow and 44 px
targets at both viewports. Twelve screenshots and the design checklist are in
[the review record](reviews/WEB-005/README.md).

**The WEB-003 browser check is discharged**: both screens drove the typed client from a real
browser through the same-origin proxy with no CORS error and no unexpected console error.

Three defects were found by looking while every automated check passed: rows read "Reported
not reported"; the list arrived in backend rather than chronological order; and detail showed
the raw route id where the list showed the line name. All fixed.

Limitations: the retained database holds no fresh realtime evidence, so no live ON_TIME,
delayed, cancelled or fresh-position row was observed; those branches rest on tests over
captured and clearly synthetic fixtures. Detail loads up to 200 stops and updates and says
when more exist, but does not yet page `afterStop`/`afterUpdate`; no retained MARC trip
approaches that bound.

## WEB-007 calculated presentation as implemented

Train detail now follows the design wireframe: official status, then MARC Now observed
movement beside the reported location, then MARC Now next stop, then MARC Now trend of
official delays, then stop times and diagnostics. `lib/presentation/movement.ts` owns the
vocabulary and `components/Calculated.tsx` the three blocks.

Two rules are enforced in one place each. A dwell renders **only** while the state is
STATIONARY, because an UNKNOWN movement can still carry the `stationarySeconds` it once
observed. And each calculated object is read independently, so a stale position reports
movement unavailable while the delay trend, built from official Trip Updates, is still
reported. Both are visible in the review captures. No replacement stop is ever invented for
a skipped candidate or a passed final stop, and a distance is worded only when the backend
said it is in metres.

Checks executed for WEB-007: `npm test` (8 files, **128 tests**), `npm run lint` (zero
warnings), `npm run typecheck`, `npm run build`, `npx playwright test` (12 tests). Rendered
review covered the real retained screen plus six clearly labelled synthetic scenarios
rendered in the real UI by intercepting the detail response; 0 px overflow and no page
errors at both viewports. Fourteen screenshots and the scenario table are in
[the review record](reviews/WEB-007/README.md).

One defect was found by looking: the trend's basis delay restated the delay already shown in
the official block when the two agreed, which DESIGN.md forbids. It is now named only when
it differs.

Limitations: **no fresh MOVING, STATIONARY, MEASURED or non-UNKNOWN trend has ever been
observed from the real backend**, so every fresh branch rests on fixtures and on screenshots
of synthetic data in the real UI, labelled SYNTHETIC throughout. Route progress is parsed and
shown in diagnostics but has no commuter-facing presentation, by decision: without route
geometry there is nothing useful to draw, and BACKEND-UI-03 gates that.

## WEB-008 alerts screen as implemented

`/alerts` renders the operator's retained advisories with effect, cause, active periods,
scope and a safe link, plus explicit refresh and bounded snapshot pagination.
`lib/presentation/alerts.ts` owns translation choice, link sanitization and the GTFS-RT
cause and effect tables.

Two rules decide what the screen may claim. An empty list reads "No active MARC alerts
reported" **only** when the feed's own `sourceHealth` is HEALTHY; otherwise it reads "Alert
information is unavailable … not evidence that MARC service is running without disruption".
And a degraded or stale feed keeps its advisories visible with a label rather than being
treated as offline. No severity is derived from the effect code, because the feed ranks
nothing. Only documented cause and effect numbers get a label; anything else reads "not
described".

Checks executed for WEB-008: `npm test` (9 files, **142 tests**), `npm run lint` (zero
warnings), `npm run typecheck`, `npm run build`, `npx playwright test` (12 tests). Rendered
review covered the real retained screen plus four intercepted scenarios: **0 px horizontal
overflow, zero non-HTTP hrefs and no page errors in every scenario at both viewports**. The
stress capture shows `<b>not bold</b>` as literal characters and no link at all for a
`javascript:` URL. Twelve screenshots are in [the review record](reviews/WEB-008/README.md).

One defect was found by looking: the scope caveat repeated verbatim on every card, four
identical sentences on the real screen. It is now stated once for the whole list.

Limitations: the retained alerts feed is a completed-day snapshot, so the advisories are
historical and the screen correctly says "Reported 1 day ago by the operator". No live feed
with a current timestamp has been observed here, and no external link was followed.

## Next session

Read AGENTS.md, architecture/design/API contract and WEB-009. Inspect status, verify the WEB-005 and WEB-008 dependencies are complete, mark WEB-009 IN_PROGRESS and implement only the MARC Pulse home experience. It is three line sections linking to filtered trains plus a small advisory preview. The hard constraint is that the backend exposes no aggregate: any summary must come from the one bounded list read the screen already makes, must state its service-date scope and its unknown coverage, and must prefer plain explanatory text wherever a count would mislead. No active or stationary totals, no fabricated healthy line status, and no per-train detail fan-out. WEB-009 is a visual ticket; automated tests alone cannot complete it. Preserve the existing backend; no map work is authorized.
