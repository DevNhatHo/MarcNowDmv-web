# WEB-MAP-6 — Adopt MapLibre GL JS as the map renderer

Status: **DONE** (2026-10-01)

Sequencing note: this runs **next, before [WEB-MAP-3](WEB-MAP-3.md)**, despite its number.
WEB-MAP-1 and WEB-MAP-2 are DONE and are not reopened; renumbering them would break the
links and the record of what was actually shipped.

## Goal

Replace Leaflet with MapLibre GL JS behind the existing map adapter, on a quiet vector
basemap, with no change to what the screen shows or claims.

## Why

The [map ADR](../MAP_PLAN.md) chose MapLibre GL JS after comparing it against ArcGIS,
Mapbox, Leaflet, OpenLayers and self-hosted PMTiles. WEB-MAP-2 shipped the map on Leaflet,
which is raster-first; the product wants a quiet vector basemap and smooth marker updates
during polling. The adapter boundary WEB-MAP-1 insisted on means the swap is contained:
Leaflet appears in exactly two files, `components/map/RouteMap.tsx` and its CSS module.

Doing this before the marker work matters. WEB-MAP-3, WEB-MAP-4 and WEB-MAP-5 all build on
the map surface, so migrating first avoids writing marker, focus and detail integration
twice.

## Dependencies

[WEB-MAP-2](WEB-MAP-2.md) and the [map ADR](../MAP_PLAN.md). BACKEND-UI-03 geometry is
delivered and verified, so no backend work blocks this.

## Scope

Render the existing MARC route geometry as MapLibre sources and layers on a quiet vector
basemap from a **no-API-key** provider; keep the line filter, the text equivalent, the
attribution and the failure path exactly as they are; load the renderer on the map route
only.

## Out of Scope

Train markers (WEB-MAP-3), focus mode (WEB-MAP-4), detail integration (WEB-MAP-5), station
markers (owed to WEB-MAP-3 by WEB-MAP-2's record), any backend change, any Esri service
beyond basemap rendering, and any change to what the map asserts about trains.

## Expected Files

components/map/RouteMap.tsx and its CSS module, app/map/page.tsx if the loading boundary
changes, .env.example, docs/ARCHITECTURE.md, docs/RUNBOOK.md, docs/MAP_PLAN.md, map tests,
package.json only if a dependency is genuinely required.

## Loading approach

MapLibre is browser-only: it touches `window` at module scope. Load it with a dynamic
`import()` inside an effect, or behind `next/dynamic` with `ssr: false`, never at module
scope, so it reaches neither a server render nor the bundle of a screen without a map. The
existing component already handles a teardown that happens while the import is in flight;
preserve that pattern rather than reinventing it.

Measure the shipped bundle on the map route and record it. For context, `@arcgis/core` is
reported at roughly 2.1 MB gzipped and Leaflet at about 42 KB; MapLibre sits between them and
should be stated from measurement, not from this sentence.

## Next.js integration

No duplicate map initialisation on re-render or Strict Mode double-invocation; the map
instance removed on unmount; the canvas resized when its container changes; and a failed load
that leaves the page usable rather than blank. All four are already satisfied by the Leaflet
component and must survive the swap.

## Geometry contract

**Unchanged.** The backend serves GeoJSON LineStrings in WGS84, longitude first, which is
exactly what a MapLibre GeoJSON source consumes — so the Leaflet build's
longitude/latitude swap simply disappears, and there is no backend change and no GTFS parsing.

Add the alignments as **one GeoJSON source with one line layer**, not a layer per shape, so a
line filter is a source-data change rather than a layer rebuild.

## Basemap and credentials

Start with a hosted vector basemap that needs **no API key**, so there is no credential to
manage, no account to create and no billing relationship at all. Record which provider was
chosen and its attribution requirement.

If a provider that requires a key is chosen instead, it goes in `.env.example` as an empty
`NEXT_PUBLIC_*` variable, is restricted by referrer in the provider's console, and is
documented in the runbook. A `NEXT_PUBLIC_` key is **public by design**; it is protected by
restriction, never by hiding it. With no key or no basemap configured, the map must degrade
to the text equivalent rather than show a broken canvas.

OpenStreetMap and provider attribution must be visible on the map screen.

## Cost

**$0 at development and early launch**, on a no-key free provider. No candidate's renderer
costs anything; all cost is tiles. Record the tile requests a typical map load actually
issues, so a later provider decision rests on a measured number.

Do not adopt PMTiles in this ticket. It is the documented future option in the ADR, and
implementing it here would be scope this ticket has not been given.

## Acceptance Criteria

The map renders the same real MARC geometry it does today, on a quiet vector basemap, with
the line filter, text equivalent, attribution and failure path unchanged. No map code loads
on a screen without a map. No credential is committed, and an absent basemap degrades to the
text equivalent. The map asserts nothing about any train. Initialisation does not duplicate
across re-render or unmount, and the canvas resizes. Attribution is visible. No MapLibre type
appears outside `components/map/`.

## Tests Required

Run all established checks including `npm run e2e`. Test that the geometry parser and screen
are unchanged; that no map code loads on a non-map route; that a missing basemap falls back to
the text equivalent; that a failed renderer load leaves the page usable; that unmount destroys
the map and remount does not duplicate it; that the line filter changes source data rather
than rebuilding layers; and that the accessibility floor still passes on `/map` with 44 px
controls.

## Manual Verification

Inspect rendered 360×800 and 1280×900 against the live backend, confirming the alignments
match what the Leaflet build drew. Record the basemap requests a load actually issues and the
map-route bundle size. Confirm no map or tile request is made from any other screen.

## Design Verification

Inspect rendered mobile and desktop against [DESIGN.md](../DESIGN.md) and
[MAP_PLAN.md](../MAP_PLAN.md): a quiet basemap with minimal road and POI detail, restrained
controls, no noisy popups, and the alignment still legible against the basemap in grayscale.
A basemap that competes with the route is the main risk here.
Capture screenshots under `docs/reviews/WEB-MAP-6/`. Missing screenshots are an incomplete
gate, not a pass. Tests alone cannot satisfy this gate.

## Definition of Done

Acceptance criteria and all required checks actually pass, with results and the measured
basemap request count recorded here. Review the diff, update the ticket index,
CURRENT_STATE.md, ARCHITECTURE.md, RUNBOOK.md and MAP_PLAN.md, and preserve unrelated work.
One completed-ticket commit with a WEB-MAP-6 subject. If no suitable basemap provider can be
used, record that as the blocker and leave IN_PROGRESS rather than making a completion commit
or shipping a map with no basemap.

## Outcome

`/map` renders on MapLibre GL JS 6.11.2 (BSD-3-Clause) over OpenFreeMap's `positron` vector
style. No API key, no account, no card, and **no backend change**: the published GeoJSON is
longitude-first already, so the Leaflet build's coordinate swap simply disappeared. Leaflet
and `@types/leaflet` are gone. The line filter, text equivalent, failure path and what the
screen claims are all unchanged.

### Measured

| | Measured |
|---|---|
| Map-route bundle | **275 kB gzipped**, own chunk, requested on `/map` and on no other screen |
| Basemap requests per load | **15** at 360×800 (726 kB), **20** at 1280×900 (647 kB) |
| Basemap requests per line filter | **0–2** |
| Basemap requests on `/`, `/trains`, `/alerts` | **0** |
| Cost | **$0** |

The ADR hedged MapLibre's weight as "between Leaflet's ~42 kB and ArcGIS's reported ~2.1 MB,
to be stated from measurement". 275 kB is that number.

### Checks actually executed

`npx eslint .` clean, `npx tsc --noEmit` clean, `npx vitest run` **204 tests in 14 files, 0
failures**, `npm run build` succeeded, `npx playwright test` **58 passed** across both required
viewports. Rendered review at 360×800 and 1280×900 in `docs/reviews/WEB-MAP-6/`, including
grayscale.

### Three defects the rendered review caught, which the tests did not

**The map was being destroyed and rebuilt on every line filter** — the thing this ticket's
"one source, one layer" rule exists to prevent. Two causes, both invisible to a test that only
checks what is drawn:

* `RouteMap` created the map in an effect keyed on `shapes`, so new geometry tore the map
  down. Creation now has no data dependency and geometry is applied in a second effect.
* `MapScreen` unmounted `RouteMap` during the load, because the filter changes the resource
  key and the next page starts undefined. It now keeps the last drawn geometry on screen,
  **with the label stored alongside it**, so the map cannot name a line it is not drawing.

Proven by measurement, not by inspection: filtering costs 0–2 tile requests instead of 15–20,
and the live canvas element survives the filter. A new e2e test pins both.

**The attribution icon was drawn twice.** The global 44 px control floor applies to
`summary`, which stretched MapLibre's 24 px toggle, and its background icon tiled into a
second copy clipped by the map frame. The target stays 44 px — the floor is not waived for a
vendor's control — and the icon is now drawn once, centred.

**The attribution credited every party twice.** A code comment asserted "the style itself
carries none"; the provider's TileJSON in fact credits OpenFreeMap, OpenMapTiles and
OpenStreetMap with the copyright link OSM requires. The custom text was removed and an e2e
test now asserts OpenStreetMap is still named, so the obligation fails loudly rather than
lapsing silently if a provider changes.

### One accessibility helper was wrong, and was corrected rather than worked around

`undersizedControls` exempted links inside a `<p>`, treating the attribution's three links as
undersized standalone controls. A credit line of links separated by punctuation is prose by
every measure except its markup, and WCAG 2.5.8 exempts targets in a block of text. The helper
now recognises a run of text by the container's **own** text around the control, so a
container holding only controls is still checked. The attribution links were not enlarged;
the check was made to say what it meant.

### Worker loading

MapLibre v6 loads its tile-parsing worker from a URL that Turbopack cannot resolve from inside
the package. `scripts/copy-maplibre-worker.mjs` copies the pinned package's own
`maplibre-gl-worker.mjs` **and** `maplibre-gl-shared.mjs` into `public/` on `predev`,
`prebuild` and `prestart`; the worker imports the shared file, so copying only the first is a
404 and a blank map. Both copies are gitignored.

### Not done, deliberately

PMTiles, per the ticket. Station markers remain owed to WEB-MAP-3 by WEB-MAP-2's record.

No blockers. Next: [WEB-MAP-3](WEB-MAP-3.md) — active train markers.
