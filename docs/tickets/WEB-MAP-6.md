# WEB-MAP-6 — Adopt MapLibre GL JS as the map renderer

Status: NOT_STARTED

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
