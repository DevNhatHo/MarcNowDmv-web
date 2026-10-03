# WEB-UI-05 — Map layout and selected-train sheet

Status: NOT_STARTED

## Goal

Make the map the strongest surface in the app, and move the engineering detail off it.

## Why

The map's behaviour is finished and good — alignments, stations, markers, focus, follow and
transitions all shipped in WEB-MAP-2 through WEB-MAP-7. What is left is **layout**: a form
section sits above the map, and the alignment statistics sit in the primary reading order
beneath it.

Those statistics — 43 alignments, 3,467 km, schedule version 1, geometry provenance — are real
and must stay available, but they answer a question about the data, not about a journey.

## Dependencies

[WEB-UI-01](WEB-UI-01.md). Behaviour from WEB-MAP-3, WEB-MAP-4 and WEB-MAP-7 is reused
unchanged.

## Scope

`MapScreen` layout, the line control, the selected-train presentation, and a secondary data
disclosure. The renderer, its sources and layers, and the transition rules are not touched.

## Out of Scope

**Any change to `RouteMap`'s source-and-layer discipline, follow rules or transition rules.**
Also: new map data, clustering, a basemap change, and offline support.

## Layout

The map takes substantially more of the viewport, with the line filter as a compact overlay
control — `All`, `Penn`, `Camden`, `Brunswick` — instead of a labelled form above it.

Two constraints the current map already honours and this ticket must not break: the map must
not steal page scroll on a phone, and the OpenStreetMap and provider attribution must stay
visible, because it is a licensing obligation and not decoration. A bottom sheet or an overlay
control that covers the attribution is a licence problem, not a layout preference.

Line names come from the catalog. `shortName` is `"MARC"` on all three routes, so a short label
such as "Penn" has to be derived from the operator's `longName`; derive it from the operator's
own string and never from a route identifier.

## Selected train

Replace the panel with a compact bottom sheet carrying the same facts, built from the **same
components** as WEB-UI-04's Quick Look. Keep every behaviour WEB-MAP-4 established: emphasis as
a data update rather than a new layer, follow only on a strictly newer fresh observation, the
viewer's own pan or zoom pausing recentring at once, and follow not offered at all while the
position is stale.

The text equivalent of the markers does not go away. A map is still not an accessible way to
convey position, and the list beneath it remains the keyboard route into selection.

## Map data details

Move alignment count, total distance, schedule version and geometry provenance into a closed
`Map data details` disclosure. **Keep the sentence that explains the total**, which exists
because 43 alignments totalling 3,467 km counts the same track many times and is not the length
of the network. Compacting that into a bare number would restate the misreading it was written
to prevent.

## Acceptance Criteria

The map occupies materially more of the viewport at both widths. Line filtering works from the
overlay and still changes source data rather than rebuilding the map. A selected train shows a
compact sheet with the same facts and wording as Quick Look. Attribution stays visible in every
state including with the sheet open. Geometry statistics are present but secondary. Every
WEB-MAP-3/4/7 test still passes unchanged.

## Tests Required

All established checks, including the whole existing map suite, which must pass **without
modification** — if a map behaviour test needs changing, the change is out of this ticket's
scope and needs saying so explicitly. Add tests for: the overlay filter changing source data
and not rebuilding the map; attribution visible with the sheet open at 360×800; the sheet not
covering the last list row; and the data disclosure closed by default.

## Manual Verification

Against the local backend with `cmd/ingest` polling, inspect the system view, a selected train,
and a filtered line at both viewports, confirming scroll, gestures and attribution.

## Design Verification

Capture into `docs/reviews/WEB-UI-05/` with a README: both viewports, system and selected
states, a filtered line, the sheet open with attribution visible, the closed data disclosure,
a stale selected train, and greyscale. Apply the [DESIGN.md](../DESIGN.md) checklist.

## Definition of Done

Acceptance criteria and all required checks actually pass, with the existing map suite green
and unmodified. Update the ticket index, CURRENT_STATE.md and MAP_PLAN.md if layout rules
change. One completed-ticket commit with a WEB-UI-05 subject.
