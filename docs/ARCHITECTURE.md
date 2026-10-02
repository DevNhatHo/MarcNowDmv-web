# Frontend architecture

## Boundary and stack

Next.js 16.3.7 with React 19.3.0, TypeScript and App Router is installed by WEB-001; package.json and package-lock.json record exact dependency versions. The implemented surface is the minimal starter page only. Native CSS custom properties and CSS Modules provide a small styling surface. Use system fonts. No runtime state library, UI framework, authentication, analytics, GraphQL, WebSockets, or AWS.

Use the [official installation guide](https://nextjs.org/docs/app/getting-started/installation) to recheck prerequisites when implementing. Node v24.13.0 and npm 11.6.2 were observed locally during planning. Use App Router [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) for the local API proxy.

## Rendering and data ownership

Server Components own the document and stable application shell. Small Client Components own interactive filters and resource subscriptions. Initial API reads can be client-side for this local milestone; server rendering realtime data is not required. Route URLs preserve line/service-date filters and opaque train identity. Do not create competing server/client fetch owners.

WEB-003 implemented this boundary. `lib/types/*` holds the wire contract, `lib/api/contract.ts`
the guard primitives, `lib/api/parse.ts` one parser per response, `lib/api/errors.ts` the closed
set of typed failures, `lib/api/client.ts` the single request function, `lib/api/{trains,alerts,catalogs,health}.ts`
the resource modules, `lib/api/pagination.ts` bounded continuation and `lib/api/paths.ts` the
allowlist shared with the proxy. Structure is validated strictly while enum vocabulary is never
rejected, so an unrecognized backend state degrades to unknown instead of breaking a screen.

A centralized typed client owns request construction, cancellation, errors, and contract parsing. Resource modules handle trains, alerts, and catalogs. Presentation helpers format values only; they never infer operational state. Known enum values have explicit labels, unknown values have neutral fallback labels. Validate response structure and nullable fields at the boundary; keep IDs as strings. Avoid a large schema dependency unless justified.

## Local proxy

Browser → same-origin `/api/backend/...` → server-only `API_BASE_URL` (default local Go origin). The implemented Route Handler allows only GET/HEAD and explicit health/catalog/train/alert paths. Preserve query strings, upstream status codes and JSON; reject arbitrary target URLs, unsupported paths/methods, and redirects to other origins. Apply a 10-second timeout, propagate cancellation where possible, and return a safe 502/504 on transport failure. Set `Cache-Control: no-store` and use uncached upstream fetches. Do not log bodies or secrets. No business logic or altered backend contract in this proxy.

The live backend response to an Origin request did not contain CORS allow headers. This proxy avoids requiring a backend change. `.env.example` deliberately uses a relative public base and server-only backend origin. Never expose database configuration to the browser.

## Intended structure (created by relevant tickets only)

```text
app/layout.tsx, app/page.tsx
app/trains/page.tsx, app/trains/[id]/page.tsx, app/alerts/page.tsx
app/api/backend/[...path]/route.ts
app/globals.css
components/ (only useful shared presentation)
lib/api/ (client, trains, alerts, catalogs)
lib/types/ (wire contracts)
lib/presentation/ (labels, times, provenance)
lib/refresh/ (central resource lifecycle, WEB-010)
tests/fixtures/, tests/e2e/
```

## Refresh and trust

WEB-005–009 initially support explicit refresh, cancellation, and visible last-received timestamps; WEB-010 adds shared polling. Central intervals: trains/detail 30 seconds, alerts 60 seconds, catalogs 10 minutes or schedule-version invalidation. One request in flight per resource key; abort on unmount/filter change, ignore superseded responses, pause while hidden, and refresh on visibility/focus. Deduplicate subscriptions. Back off failed refreshes to at most 120 seconds. Manual retry is available. Do not auto-walk unbounded pages on each tick.

Retain previous successful content during refresh. On failure label it as last received/out of date immediately. After two missed resource intervals also stop presenting cached positive claims as current. This is response-cache age, not a reimplementation of backend freshness or movement rules. An age label may tick locally without new network calls or extending stationary duration. A new response restores current display according to its own backend freshness. Do not turn a missing feed into healthy data.

Version/snapshot conflicts restart pagination at most once, discard incompatible cursors, and keep old content visibly outdated until replacement succeeds. Never merge pages from different versions. Catalog names may be joined only for matching schedule versions; old-version detail falls back to IDs.

## Verification architecture

Vitest and Testing Library are development-only dependencies for contract parsing, presentation, and fake-clock refresh behavior. Playwright is planned for mobile/desktop, keyboard, and deterministic network scenarios. No runtime testing dependencies or arbitrary coverage threshold. Live local smoke tests are separate from deterministic CI fixtures. Capture-derived fixtures retain provenance; synthetic states are clearly marked, never called live observations.

See [API contract](API_CONTRACT.md), [design](DESIGN.md), and [runbook](RUNBOOK.md).

## Map roadmap addendum

System map and train focus are now required follow-on work after WEB-012. Use a shared lazy-loaded client-only Leaflet adapter, canonical backend shape geometry, existing centralized resource ownership and shared train-detail presentation. `/map` supports system mode and query-based train selection; detail can open the same focused map. No map code is installed in this update.

**Superseded 2026-10-01 by the [map ADR](MAP_PLAN.md):** **MapLibre GL JS** is the chosen
renderer, with a no-API-key hosted vector basemap initially and self-hosted PMTiles as the
documented future option. [WEB-MAP-6](tickets/WEB-MAP-6.md) migrated the shipped Leaflet map
and is done; Leaflet is no longer a dependency.

The decision separates **renderer** from **basemap provider** deliberately. MapLibre is
BSD-3-Clause and tied to no tile vendor, so the basemap is a configuration change rather than
a rewrite; Mapbox GL JS v2+ is under Mapbox's own terms and requires a card from day one, and
ArcGIS would add a proprietary dependency and a reported ~2.1 MB gzipped bundle to use almost
none of a GIS platform the backend already replaces.

The renderer loads browser-only, on the map route only, and **no vendor type appears outside
`components/map/`**: MARC data reaches the adapter as a provider-neutral view model or
GeoJSON. The geometry contract is unchanged — GeoJSON LineStrings in WGS84, longitude first,
are what a MapLibre GeoJSON source consumes directly.

All alignments live in **one GeoJSON source behind one line layer**, so changing the line
filter is a `setData` call. Two consequences shape the components, and both are load-bearing
rather than stylistic:

* `RouteMap` creates the map in an effect with **no data dependency** and applies geometry in
  a second effect. Putting `shapes` on the creating effect destroys and rebuilds the map, its
  style and its controls on every filter change.
* `MapScreen` keeps the **last drawn geometry** on screen while the next line loads, because
  the resource key changes with the filter and the gap would unmount the map. The label is
  stored with the geometry it describes, so the map never names a line it is not drawing.

Measured: filtering a line costs **0–2 tile requests**, against the 15–20 a fresh map load
issues.

The same discipline governs **train markers** under the [live movement addendum](MAP_PLAN.md):
trains are their own source and layer, keyed by the backend's train identity, updated with
`setData` on the polling cadence. A marker moves only for a newer `position.sourceTimestamp`.

The frontend's one addition to the data is a **presentation transition** between two positions
the backend already published — bounded at both ends by real observations, stopped by stale
data, absent under reduced motion, and never recorded or shown as an observation. It never
extrapolates past the newest position. Route-aware motion reads `calculated.routeProgress`
`fractionAlong` and samples the already-loaded alignment, which is rendering rather than map
matching; because `calculated` is deliberately absent from the trains list, that is available
for the focused train only, and the system map uses a straight transition. See
[BACKEND-UI-06](BACKEND_GAPS.md).

The original Leaflet recommendation below is retained as the record of what WEB-MAP-1 assessed
and WEB-MAP-2 shipped.

Recommend a neutral background with backend geometry initially, avoiding an external basemap provider. Map freshness, bearing, progress and active-set rules are specified in [MAP_PLAN.md](MAP_PLAN.md), including library alternatives and source references. No fake continuous movement, browser movement calculation, frontend GTFS parsing or per-marker detail fan-out. Geometry and backend-defined active membership are explicit API dependencies. Extend the proxy allowlist/types only after actual backend contracts exist.

## Visual foundation

WEB-002 defines role-based CSS custom properties in app/globals.css for spacing, typography, neutral/status colors, borders/radii, widths/gutters, focus and reduced motion. Starter-specific composition is in app/page.module.css. Future screens should reuse the tokens; semantic colors always require text labels, and unknown/stale must not be presented as healthy. Contrast evidence and supported backgrounds are recorded in docs/DESIGN.md.
