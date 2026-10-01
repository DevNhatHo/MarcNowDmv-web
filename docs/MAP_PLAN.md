# System map and train focus plan

Planning addendum, 2026-09-29. Map is now required roadmap work, following the original core milestone. WEB-001–012 remain intact. No map implementation or backend modification is authorized in this planning session.

## Architecture and navigation

Use one lazy-loaded browser-only Leaflet adapter, shared by `/map` and the existing train-detail page. Import browser-dependent mapping code only in the client boundary; ordinary lists and detail text must work without it. The adapter renders validated geographic data and manages camera/selection, not transit business logic. Clean up map instances, events and subscriptions on unmount; verify React development remounts do not leak resources.

`/map` is system mode. `/map?train=<opaque-id>` selects a train, highlights its exact shape, dims unrelated trains and exposes the same status/movement/freshness components as train detail. `/trains/[id]?view=map` opens a focused map alongside the existing detail experience. Preserve service date, filters and return context in navigation; allow deep links and browser Back. There is one train-detail data model and presentation, not a second map-specific detail product.

Selecting a train centers once on its valid observed position, with room for the persistent detail panel. If no coordinate exists, show the route or system extent with “Position unavailable”; never manufacture a location. On mobile the map sits above the selected-train summary, not behind a popup that must be reopened. Desktop may use a restrained adjacent panel. Selected train, next stop and its route dominate; no extra unrelated layers.

A clearly labeled optional Follow control recenters only when a newer valid, fresh backend observation arrives. User panning suspends follow. Stale data stops follow and keeps the last marker visibly historical. Exit focus restores system view; provide a visible control and keyboard route back to selection. Do not snap the camera back on every ordinary refresh.

## Library/provider recommendation

Recommend **Leaflet**, using the stable release available at implementation time, with direct integration behind a small React component rather than an additional wrapper unless justified. It supports GeoJSON, line styling, markers, camera control and keyboard interaction; these fit a modest two-dimensional MARC map. Its BSD-2-Clause license has no per-view library charge. Recheck stable version and license in WEB-MAP-1; current official reference documents 1.9.4 and separately links the 2.0 alpha. Do not choose an alpha merely because it has a larger version number.

Initial basemap provider: **none**. Draw real backend GTFS geometry and scheduled station labels on a neutral geographic background using Leaflet's projection/pan/zoom. This is a rail-focused geographic map, not a custom map engine or straight-line station diagram. It removes POI/road clutter and external tile requests/cost; WEB-MAP-1 must verify that orientation is understandable on mobile. Preserve required source/license notices for the actual data used.

| Option | Fit and tradeoff |
|---|---|
| Leaflet + backend geometry, no tiles | Recommended initial mode: simple 2D lines, markers and focus; no external basemap API bill. Needs a rendered legibility and mobile-performance check. |
| Leaflet + OSM standard raster tiles | Optional local orientation fallback only after policy review. Visible attribution and tile-use rules apply; raster POIs cannot be selectively removed. Public tiles are not an unlimited production service or guaranteed free infrastructure. |
| MapLibre GL JS + a separately chosen vector-tile provider | BSD-3-Clause, GPU-rendered vector styling enables selective layer removal and richer future maps. More renderer/style/provider decisions than needed initially; reconsider if measured volume or required basemap styling justifies it. Library licensing does not make tile hosting free. |

Do not purchase a service, provision tiles or build a custom rendering engine as part of planning. If neutral-background orientation fails, document the specific provider, licensing, attribution, limits and expected cost before adopting a tile service. Optional tiles must fail gracefully while MARC geometry and text remain useful.

Official references checked during this update: [Leaflet features](https://leafletjs.com/), [API reference](https://leafletjs.com/reference.html), [Leaflet license](https://github.com/Leaflet/Leaflet/blob/main/LICENSE), [MapLibre project](https://maplibre.org/projects/gl-js/), [MapLibre license](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), [OSM attribution](https://www.openstreetmap.org/copyright). Performance and accessibility are implementation checks, not guarantees from a library choice.

## Required data and current availability

| Need | Current backend | Required treatment / gap |
|---|---|---|
| Canonical route/trip geometry | GTFS shapes stored internally; no public geometry endpoint | BACKEND-UI-03 must expose bounded, versioned geometry and exact trip-to-shape association, including old-version detail. Prefer GeoJSON LineString/MultiLineString with longitude/latitude order. No GTFS parser, invented straight lines or browser map matching. |
| Active system train set | Service-date train list includes scheduled and completed trips | BACKEND-UI-02 must define active inclusion, overnight service, retained stale candidates, expiry and coverage. Do not infer “active” from the day's schedule or a non-null coordinate. |
| Marker identity/status/position | Opaque train ID, tripId, routeId, official status, lat/lon, nullable bearingDegrees, source/received times and freshness available | Keep unknown/null values and independent provenance; missing coordinate means no geographic marker, with train accessible in a text list. Preserve last observation across refresh failures only as historical. |
| Train number, line/destination/direction | Matching-version route catalogs; no commuter number/headsign/direction metadata | BACKEND-UI-01 remains proposed. Verbatim tripId fallback; omit unsupported destination. A valid reported bearing may orient an arrow; never derive travel direction from shape order or successive positions. |
| Movement in system mode | Only train detail has calculated states | BACKEND-UI-02 should expose bounded summaries with freshness, or omit system movement and fetch detail only for selection. No detail request per marker. |
| Focused progress and next stop | Detail calculated.routeProgress and calculated.nextStop expose states, distances and fraction where supported | Only display backend-supported measured progress/identified stop. Resolve station coordinate/name using matching version. Unknown/ambiguous/off-route never becomes precise progress. Report skipped candidate accurately. |
| Delay and trend | Official status and independent detail trend | Reuse existing components; stale GPS does not invalidate a separately supported official delay trend. |

BACKEND-UI proposals live in [BACKEND_GAPS.md](BACKEND_GAPS.md). They are not implemented endpoints or assigned MARC tickets. WEB-MAP-1 can finish a contract assessment documenting missing APIs; geometry and active-system implementation cannot be marked DONE with only invented fixtures or a fabricated “active” filter.

## Position trust and update rules

- A solid current marker requires backend-fresh, valid Vehicle Position evidence and a response still trusted under the central refresh policy. Label current position and its age; an official status alone cannot make a coordinate live.
- Stale/unavailable retained positions use an outlined/muted marker and explicit “Last known position” plus “Position stale · last updated X min ago” where a timestamp is known. Missing timestamp stays unknown. Symbol shape/text, not color alone, distinguish historical markers. Stale markers are not counted as live trains.
- If movement is STATIONARY **and** position evidence remains fresh, show “MARC Now · Appears stationary · [backend duration]”. With stale GPS, prioritize last-known/stale wording; do not carry a stationary claim forward or extend duration using wall time.
- New observations move the marker directly to their reported coordinates. No continuous motion, extrapolation, route snapping, invented bearing or simulated progress. Initial implementation has no interpolation. Any later transition must only connect known observations, remain visually qualified and honor reduced motion; it is not part of these tickets.
- Keep per-source status independent. Cached-response failures use existing WEB-010 policy, remove current/live emphasis and do not retain animated movement. Out-of-order responses cannot rewind a marker. Membership disappearance follows the backend's explicit retention semantics, not a frontend guessed active window.
- Share centralized 30-second train refresh/subscriptions, hidden-tab pause, cancellation, retry and bounded pagination. Immutable geometry can be cached by scheduleVersion/shapeId with bounded invalidation; do not download shapes on every position tick. A selected train adds at most its detail request, not a fan-out.

## Restrained and accessible interaction

Keep controls to zoom, system view/exit focus and follow where useful. Small textual key for current versus last-known; no giant legend or popup. A focused train's status stays readable outside the map. Use 44px control targets, visible focus, keyboard marker/list selection and a semantic train list offering equivalent navigation. No information available only on hover or a visual canvas. Avoid stealing page scroll on mobile; test gestures, map sizing, 200% zoom and keyboard escape paths. Overlapping markers must remain individually reachable from the text list. If rendering fails, preserve textual detail and retry affordance.

Show route/line, official delay/status, movement, freshness, direction, next stop, backend route progress and distance where available. Direction of a stale bearing is historical, not a current travel claim. Never infer a train's cause of delay or station proximity from marker location. Source diagnostics remain in existing disclosure.

## Verification and sequence

Keep core WEB-001–012 first. Then WEB-MAP-1 → WEB-MAP-2 → WEB-MAP-3 → WEB-MAP-4 → WEB-MAP-5. WEB-MAP-2 requires delivered BACKEND-UI-03; WEB-MAP-3 requires delivered active/membership contract from BACKEND-UI-02. Metadata enhancements improve labels but do not block safe ID fallbacks. Backend work requires its own authorization; these dependencies do not authorize editing it here.

Every visual map ticket requires real rendered mobile/desktop review and screenshots when available, covering loading, errors, empty system, unknown coordinates, mixed fresh/stale trains, stationary versus stale, long IDs, overlapping markers, selection, reduced motion and relevant real backend responses. Mark synthetic scenarios explicitly. Test no fake movement, no stale follow, bounded requests, no data leaks across schedule versions and text-only fallback. WEB-MAP-5 records an end-to-end system→focus→detail→system journey and extends the existing smoke tests rather than duplicating them.

## WEB-MAP-1 assessment (2026-09-30)

An assessment, not an implementation. **No map code, dependency or screen was added**, and
no map rendering ticket is cleared by anything here.

### Library and provider decision

**Leaflet 1.9.4, BSD-2-Clause**, confirmed from the npm registry rather than from memory. It
stays the recommendation: it is small, needs no API key, renders plain GeoJSON without a
tile provider, and its licence imposes nothing beyond attribution of the library itself. It
is **not installed**; installing it belongs to WEB-MAP-2, the first ticket that renders
anything.

**No external basemap.** The plan's neutral-background approach holds: MARC geometry drawn
on a plain background needs no tile service, no API key, no per-view cost and no
third-party request from a commuter's browser. A basemap would add all four, and the
question this map answers — where a train is along its own line — does not need streets
underneath it.

Accessibility consequence, decided now rather than later: a map is not an accessible way to
convey position, so the map screen must carry the same information as text. The detail
screen already does — reported location, next stop, progress — so the map is an alternative
view of information already available without it, never the only route to it.

### Data contract verification

Probed against the running backend, not inferred:

| Map need | Source | Status |
|---|---|---|
| Route geometry | none | **Missing.** `/api/v1/shapes`, `/api/v1/geometry` and `/api/v1/routes/geometry` all return 404. `calculated.routeProgress.shapeId` names a shape but carries no coordinates. Gate: BACKEND-UI-03. |
| Which trains to draw now | none | **Missing.** `/api/v1/trains/active` returns 404; the list is a whole scheduled service date. Gate: BACKEND-UI-02. |
| Position | `data.position.latitude` / `.longitude` | **Available**, nullable, on list and detail. |
| Bearing | `data.position.bearingDegrees` | **Available**, nullable. Orients a marker; it is never a destination. |
| Position freshness | `data.position.freshness` + `sourceTimestamp` | **Available.** Decides solid versus outlined markers. |
| Progress along a line | `calculated.routeProgress` | **Available** as a measurement, but it is not geometry and cannot be drawn without BACKEND-UI-03. |
| Station positions | `/api/v1/stops` `latitude` / `longitude` | **Available**, nullable. |
| Selected train's detail | `/api/v1/trains/{id}` | **Available.** |
| Destination label | `/api/v1/departures` `headsign` | **Newly found**, stop-scoped and SCHEDULED. Absent from list and detail, so markers still fall back to `tripId`. |

Every field above has a source or an explicit fallback, and no proposed payload is
described as if it existed.

### Gates, restated plainly

**WEB-MAP-2 and WEB-MAP-3 cannot be started.** Their dependencies are *delivered* backend
contracts, and the backend's route table contains neither. WEB-MAP-4 and WEB-MAP-5 chain
off them. Documenting the absence satisfies this assessment ticket; it does not satisfy
theirs, and no map ticket may be cleared on synthetic geometry.

### Orientation experiment

**Not performed.** A temporary Leaflet spike would have rendered invented coordinates, and
the one thing this ticket must not produce is a picture that looks like MARC geometry but
is not. The feasibility question it would have answered is settled by Leaflet's documented
GeoJSON support and needs no invented data.
