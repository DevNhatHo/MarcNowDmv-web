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

## ADR: map rendering library and basemap source, 2026-10-01

Supersedes the Leaflet recommendation in the WEB-MAP-1 assessment and the ArcGIS-only
direction drafted earlier the same day. Both evaluations are kept below as the record.

### The distinction that drives the decision

**Rendering library** and **basemap/tile provider** are two choices, not one. A renderer tied
to one vendor's tiles couples both; a vendor-neutral renderer lets the basemap change later
without touching MARC train code. That property is worth more to this project than any
feature difference, because the backend already owns all the geospatial intelligence and the
frontend needs a renderer, not a GIS platform.

### Candidates

| | Licence (verified from the registry) | Basemap coupling | Free tier | Card required |
|---|---|---|---|---|
| **MapLibre GL JS** 6.11.2 | **BSD-3-Clause** | none — any compatible source | provider-dependent; no-key options exist | **no** |
| Mapbox GL JS 3.32.0 | **"SEE LICENSE IN LICENSE.txt"** — not OSI | renderer bound to Mapbox terms | 50k map loads/month | **yes, from day one** |
| ArcGIS Maps SDK | proprietary | Esri basemaps | 2M basemap tiles/month | no; exceeding disables service rather than billing |
| Leaflet 1.9.4 | BSD-2-Clause | none | n/a | no |
| OpenLayers 10.10.0 | BSD-2-Clause | none | n/a | no |
| MapLibre + PMTiles | BSD-3 renderer, OSM data | self-hosted | n/a | no |

### Decision

**MapLibre GL JS**, with a **no-API-key hosted vector basemap** initially, and **PMTiles on
object storage as the documented future option**.

### Why

The hypothesis held up. MARC Now DMV already owns route geometry, positions, membership,
movement, next stop, progress, delay and freshness; what it needs is a modern vector renderer
that draws GeoJSON well on a phone. Every candidate can draw a line — the decision turns on
licence, coupling and cost risk, and MapLibre wins all three.

Its licence is BSD-3-Clause, so the renderer itself is vendor-neutral and cannot be
relicensed out from under the project — the exact thing that happened to Mapbox GL JS in
December 2020 and produced MapLibre as the fork. It is tied to no tile provider, so the
basemap is a configuration change rather than a rewrite. And free providers exist that need
**no API key and no credit card**, which makes development genuinely $0 with no billing
relationship at all.

### Why not the others

**ArcGIS** is the most capable GIS platform here and that is the problem: we would take on a
proprietary dependency and a reported **~2.1 MB gzipped** bundle to use almost none of it,
paying in weight and vendor dependency for services the backend already performs. Its billing
safety is genuinely good — with pay-as-you-go disabled, exceeding the 2M free tile tier
disables service rather than charging — but a renderer an order of magnitude smaller, with no
account at all, is a better fit for "less, but better".

**Mapbox GL JS** is rejected on licence and lock-in, not capability. Version 2+ is under
Mapbox's own terms rather than an OSI licence, the renderer is bound to Mapbox services, and
it **requires a credit card from day one** even for the free tier. MapLibre is its open fork
and gives the same rendering model without any of that.

**Leaflet** is what WEB-MAP-2 shipped and it works, but it is raster-first: no vector tiles,
no style-driven basemap, no GPU rendering of many markers. The product wants a quiet modern
vector basemap and smooth marker updates during polling, which Leaflet does not give without
fighting it.

**OpenLayers** is capable and liberally licensed, but its API surface is large and
GIS-oriented, and its styling is less ergonomic for the restrained look this product wants.
It would cost more code for no advantage here.

### Basemap strategy

Start with a hosted vector basemap that needs **no API key**, so there is no credential to
manage and no account to create. If a chosen provider later requires a key, it goes in
`NEXT_PUBLIC_MAPTILER_API_KEY` or similar, restricted by referrer, and the adapter changes in
one place.

The style must be quiet: minimal road detail, no POI clutter, muted colours, so the MARC
alignment and train markers dominate. Attribution for OpenStreetMap data and the provider is
required and always visible.

### Expected cost

| Stage | Cost |
|---|---|
| Development | **$0** — no-key provider, no account, no card |
| Early launch | **$0** at realistic MARC volumes on a free tier |
| Moderate usage | **$0–$30/month** on a paid tile plan, or roughly **$0.35/month storage plus CDN egress** on self-hosted PMTiles |

No candidate's rendering library costs anything; all cost is tiles.

### Vendor lock-in

Low by construction. The renderer is BSD-3 and the basemap is a URL. Switching providers is a
style-URL change; switching to self-hosted PMTiles adds a protocol registration and nothing
else. No MARC train code touches a vendor type.

### As implemented, measured (WEB-MAP-6, 2026-10-01)

| | Measured |
|---|---|
| Renderer | MapLibre GL JS 6.11.2, BSD-3-Clause, **275 kB gzipped**, own chunk, requested on `/map` only |
| Basemap | OpenFreeMap `positron`, no API key, no account, no card |
| Tiles per map load | **15** at 360×800, **20** at 1280×900 (726 kB / 647 kB) |
| Tiles per line filter | **0–2** — the map is not rebuilt |
| Tiles on any other screen | **0** |
| Attribution | from the provider's TileJSON: OpenFreeMap, OpenMapTiles, OpenStreetMap with its copyright link |

The ADR's weight estimate was right to be hedged: MapLibre measured at 275 kB gzipped, between
Leaflet's ~42 kB and `@arcgis/core`'s reported ~2.1 MB, as predicted.

### Future: PMTiles

Credible, and worth keeping as the escape hatch. A single `.pmtiles` archive on object storage
behind a CDN, read by range requests, with **no tile server to run**. A regional extract —
the Mid-Atlantic rather than the planet — can be cut from Protomaps' daily builds with the
`pmtiles` CLI; regional extracts are typically a few GB, costing roughly **$0.35/month** in
storage plus CDN egress.

The tradeoffs are operational, not technical: someone must regenerate the archive to keep the
basemap fresh, own the storage and CDN, and carry the OSM attribution. **Do not implement it
now.** It is the answer if tile costs or provider terms ever become a problem, and recording
it is enough until then.

### The architectural property that makes all of this cheap

`components/map/` holds the vendor adapter and nothing else does. MARC data reaches it as a
**provider-neutral view model or GeoJSON**; no Esri, Mapbox or MapLibre type appears anywhere
else in the app. WEB-MAP-2 already proved this works — Leaflet lives in exactly two files, so
replacing it is contained. That boundary is the reason this decision can be revisited later
at low cost, and it must be preserved.

## Earlier evaluation: ArcGIS, 2026-10-01 (retained as record; superseded by the ADR above)

Direction change, recorded rather than rewritten over: WEB-MAP-1 assessed and WEB-MAP-2
shipped **Leaflet 1.9.4**, and that work stands. ArcGIS Maps SDK for JavaScript is now the
preferred implementation, and the existing map is migrated to it by
[WEB-MAP-6](tickets/WEB-MAP-6.md) rather than being rebuilt from nothing.

The swap is contained because WEB-MAP-1 insisted on an adapter boundary: Leaflet appears in
exactly **two files**, `components/map/RouteMap.tsx` and its CSS module. Nothing else in the
app imports a map library, and the screen, the data path, the text equivalent and the
accessibility floor are all library-agnostic.

### Division of responsibility, unchanged

```
MTA GTFS / GTFS-RT → Go backend → PostgreSQL/PostGIS → MARC Now DMV API → ArcGIS SDK → user
```

Esri **renders**. It does not decide anything. The backend remains the only source of route
geometry, train positions, active membership, movement state, next stop, route progress,
delay and freshness, and no MARC business rule moves into a map layer. In particular, a
marker's appearance is chosen from backend fields; the map never infers that a train is
stationary, late, active or anywhere.

### How it is loaded, and why not the npm package

**Load from the CDN with `$arcgis.import()`, on the map route only. Do not add
`@arcgis/core` to the build.**

This is the one place where the preference and this app's constraints genuinely conflict, so
the reasoning is recorded. `@arcgis/core` is reported at roughly **2.1 MB gzipped**, against
Leaflet's **~42 KB** — about fifty times larger — and it is widely reported not to tree-shake.
This is a mobile-first commuter app whose entire design principle is "less, but better", and
whose current map page loads in 2.2 s with 262 DOM nodes.

Bundling the SDK would put megabytes into the build for every visitor, including the majority
who never open the map. The CDN route keeps it off `/`, `/trains`, `/trains/[id]` and
`/alerts` entirely, and `$arcgis.import()` is Esri's own recommendation for new CDN
applications. The cost is a third-party script on the map route, which is acceptable for the
one screen that needs it and must be stated in the privacy-facing documentation.

If a future measurement shows the CDN approach unworkable, the fallback is a route-level
dynamic import of `@arcgis/core` behind `next/dynamic` with `ssr: false` — still off the
other screens, but far heavier. Measure before choosing it.

### Geometry contract: unchanged, already suitable

The backend serves **GeoJSON LineStrings in WGS84, longitude first** (MARC-506). That maps
directly onto an Esri `Polyline`, whose `paths` take the same `[x, y]` ordering at
`wkid: 4326`, so no backend change and no coordinate transformation is needed — the one
existing longitude/latitude swap for Leaflet simply disappears.

Station coordinates come from `/api/v1/stops`. Nothing parses `shapes.txt`, and no
straight-line segment is ever substituted for missing geometry: a shape that cannot be drawn
is reported as absent.

### Layers

Five, in order, and no more:

1. Esri basemap, a quiet style with minimal road and POI detail
2. MARC route shapes
3. MARC stations
4. Active trains
5. The selected train and its emphasised route

Train and station layers are **graphics layers updated in place**, not rebuilt each cycle.

### Update flow

| Data | Cadence | Why |
|---|---|---|
| Route geometry | once per schedule version, cached | immutable for a version; never refetched on a position tick |
| Stations | catalog cadence | changes only on activation |
| Train positions | the existing 30-second train cadence | one bounded list read, no per-train request |
| Selected train detail | on selection only | one request, not a fan-out |

The system map must never issue a request per train or per marker. Positions come from the
single `/api/v1/trains` read the app already makes, which now carries `membership` and
`scheduled.shapeId`.

### Freshness, the hard rule

A **fresh** Vehicle Position is drawn as a current marker. A **stale** one is drawn as a
last-known marker, visually distinct by **shape and label, never by colour alone**, and
labelled with its age — "Last known position · updated 7 min ago". A stale marker is never
animated, never moved, and never counted as a live train.

`STATIONARY` with a fresh position reads "Appears stationary · 6 min", using the backend's own
duration. With a stale position the screen says "Position stale" and makes **no movement
claim at all**. These are different states and the frontend never derives one from the other.

### Accessibility

A map is not an accessible way to convey position, so nothing may be available only on it.
Every selected train's identity, status, position age, next stop and movement state must also
appear in ordinary semantic markup beside the map, and the existing train list and detail
screens remain complete without it. Map controls keep 44 px targets and visible focus, and
the whole surface degrades to the text equivalent when the SDK fails to load.
