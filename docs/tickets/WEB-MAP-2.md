# WEB-MAP-2 — Canonical MARC route rendering

Status: DONE (2026-10-01) — stations not drawn; see Limitations

## Goal

Display the backend’s real MARC geometry on a restrained system map.

## Why

The map is required roadmap work and must preserve the existing commuter hierarchy and data-trust rules.

## Dependencies

[WEB-MAP-1](WEB-MAP-1.md). Also requires delivered BACKEND-UI-03; see [backend proposals](../BACKEND_GAPS.md).

## Scope

Add lazy browser-only Leaflet adapter and /map route/navigation; render canonical versioned shapes and matching stations with neutral background, limited controls, loading/error/empty states and text fallback. Cache geometry by immutable version/shape identity.

## Out of Scope

Train markers, approximate straight-line routes, frontend GTFS import, focus/follow and backend changes.

## Expected Files

app/map/page.tsx, components/map/*, lib/api/geometry.ts, verified wire types/proxy allowlist, map tests, docs/RUNBOOK.md.

## Implementation Notes

External gate: delivered BACKEND-UI-03 geometry contract and actual samples. Respect GeoJSON longitude/latitude order and exact trip-shape association; no active-catalog names on old-version geometry. Recheck payload bounds and attribution.

## Acceptance Criteria

Actual local canonical geometry renders without invented segments; version mismatch/error is explicit; no repeated geometry download per refresh; map can fail without hiding text navigation; no unused library on non-map screens.

## Tests Required

Run test/lint/typecheck/build and relevant browser tests. Test coordinate order, bounds, null/malformed geometry, version changes, cancellation, cleanup/remount and load failure.

## Manual Verification

Review mobile/desktop actual route geometry and station labels, zoom/pan/keyboard, long names, loading/error/empty; record screenshots where possible.

## Design Verification

Inspect rendered 360×800 mobile and 1280×900 desktop, actual data where available, loading/empty/error states, independent official/calculated labels and current versus last-known marker semantics. Use [DESIGN.md](../DESIGN.md) and [MAP_PLAN.md](../MAP_PLAN.md); capture screenshots when possible. Tests alone cannot satisfy this gate.

## Definition of Done

Acceptance criteria and required checks pass with recorded evidence. Update ticket/index/current state and relevant docs, review diff and preserve unrelated work. One completed-ticket commit with WEB-MAP-2 subject. Missing required backend contracts block implementation completion; record the blocker and leave incomplete rather than making a completion commit.

## Outcome

`/map` renders the canonical MARC alignments the backend publishes, with a line filter, a
text equivalent, and Map added to the primary navigation.

Leaflet 1.9.4 is a **runtime dependency** and is imported dynamically inside an effect, so it
never reaches a server render and never enters the bundle of a screen that does not draw a
map. The neutral background decision from WEB-MAP-1 holds: no tile provider, no API key, no
per-view cost and no third-party request from a commuter's browser.

The boundary gained `lib/types/geometry.ts`, a parser, `lib/api/geometry.ts` and the proxy
allowlist entry. The parser **refuses geometry that is not drawable**: a non-LineString, a
coordinate that is not a pair, or a line of fewer than two positions each fail with the path
that disagreed, because drawing any of them would invent a segment the feed does not contain.
Coordinates stay longitude-first, and the single place that order meets Leaflet's
latitude-first API is one `map` call with a comment saying so.

Checks actually executed: `npm test` (**14 files, 204 tests**), `npm run lint` (zero
warnings), `npm run typecheck`, `npm run build` (`/map` registered) and `npx playwright test`
(**48 tests, 24 per viewport**), including the accessibility floor extended to the new screen.

Live verification drew **43 alignments for all lines and 17 for one**, with 44 px zoom
controls, 0 px overflow and no page errors at both viewports. Two bounded reads per load and
no cursor followed. Evidence in [the review record](../reviews/WEB-MAP-2/README.md).

## Four defects found by looking

The text equivalent was a wall of 43 raw shape identifiers — ingestion detail that DESIGN.md
places in diagnostics only; it is now the lines, with identifiers in a closed disclosure.
Leaflet's 30 px zoom buttons were restyled to 44 px rather than exempted from the floor. A
focusable `role="img"` containing those buttons was a genuine `nested-interactive` axe
violation and is now a named `section`. And the 3,467 km alignment total read as a network
length, when a line publishes a separate alignment per direction and variant, so the caption
now says the same track is counted more than once.

## A test-harness finding

Adding the map took the Playwright suite to 3.1 minutes with widespread 49-second timeouts.
The cause was the suite contending with itself — unbounded workers each pulling 560 kB of
geometry against a four-connection local pool. Twelve concurrent geometry requests by hand
all returned 200 under 110 ms, and a single map load measured 2.2 s with fewer DOM nodes than
the trains list, so the product path was never implicated. Workers are bounded to four with
the reason in the config, and the suite is back to about 31 s.

## Limitations

**Stations are not drawn.** The ticket's scope mentions matching stations and they are owed:
the stops catalog has coordinates, but placing them meaningfully needs the route-to-stop
association that only a trip exposes, and reading that is better done alongside markers in
WEB-MAP-3. Recorded rather than quietly dropped.

**No train appears on the map**; that is WEB-MAP-3.

The all-lines view draws 43 alignments of which the backend reports only 21 distinct
geometries. Deduplication would roughly halve the payload and is recorded as a measured,
deliberately deferred option in MARC-506's outcome.

No blockers. Next: [WEB-MAP-3](WEB-MAP-3.md) — active train markers with position trust.
