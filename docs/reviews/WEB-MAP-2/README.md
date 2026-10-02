# WEB-MAP-2 rendered review

Production build in installed Chrome at 360×800 and 1280×900, against the live local backend
serving the geometry MARC-506 delivered.

## Screenshots

| File | What it shows |
|---|---|
| `*-map-all-lines.png` | all 43 published alignments |
| `*-map-one-line.png` | one line filtered, 17 alignments |
| `*-map-alignment-details.png` | the raw-identifier disclosure opened |
| `*-map-grayscale.png` | grayscale, for colour independence |
| `*-map-unavailable.png` | geometry unreachable; the page survives |

## Measurements

| | Mobile | Desktop |
|---|---|---|
| Polylines drawn, all lines | 43 | 43 |
| Polylines, one line | 17 | 17 |
| Zoom control height | **44 px** | 44 px |
| Horizontal overflow | 0 px | 0 px |
| Page errors | none | none |

Requests on load: `/api/v1/shapes?limit=200` and `/api/v1/routes?limit=200` — **two bounded
reads, no cursor followed**. Geometry is read on the catalog cadence, not the thirty-second
train cadence, because it is immutable for a schedule version.

Separately measured in a browser: a map load is **2.2 s with 262 DOM nodes**, fewer than the
trains list at 520. The map is not the heavy screen it looks like.

## Defects found by looking, not by tests

1. **The text equivalent was a wall of raw shape identifiers.** The first build listed all 43
   alignments as "Shape 116473 · 90.0 km · 485 points" — internal ingestion ids that mean
   nothing to a commuter, mostly near-duplicates, and exactly what DESIGN.md says belongs
   only in diagnostics. The text equivalent is now the **lines**, each linking to its
   filtered map; the identifiers moved into a closed "Alignment details" disclosure.
2. **Leaflet's zoom buttons are 30 px.** The design plan requires 44 px map controls, so they
   are restyled rather than exempted from the accessibility floor: a control that is hard to
   hit on a phone is hard to hit whoever shipped it.
3. **A focusable `role="img"` containing Leaflet's controls** was a real `nested-interactive`
   axe violation. The container is now a named `section` with no role and no tabindex; the
   controls keep their own focus handling.
4. **The alignment total read as a network length.** 43 alignments sum to 3,467 km, but a
   line publishes a separate alignment per direction and variant, so the same track is
   counted several times. The caption now says so rather than letting the number imply a
   network size.

## A test-harness finding, recorded rather than hidden

Adding the map made the full Playwright suite take **3.1 minutes with widespread 49-second
timeouts**. The cause was the suite contending with itself: unbounded workers, each loading
560 kB of geometry, against a local backend with a four-connection pool. Twelve concurrent
geometry requests issued by hand all returned 200 in under 110 ms, and a single map load is
2.2 s, so the product path was never the problem. Workers are bounded to four, with the
reason recorded in the config; the suite is back to about 31 s.

## Design checklist

- **What dominates?** The map, then the line list. The page answers "where do the lines run".
- **Anything duplicated?** This was a finding, twice: the per-shape list duplicated the map,
  and with a single alignment the total restated the one row. Both are fixed.
- **Severity appropriate?** No status colour is used. A route alignment has no severity.
- **Unknown distinct from healthy?** An absent alignment says the schedule publishes none and
  that this "is not a statement about whether trains are running".
- **Official distinct from calculated?** Geometry is SCHEDULED and the page says so twice: in
  the scope line and in the attribution. Nothing calculated appears.
- **Does mobile work naturally?** Yes; 0 px overflow, the map sized to the viewport, controls
  at 44 px.
- **Without colour?** The grayscale capture keeps the alignment visible against the neutral
  background, and the legend carries a text label beside the line sample.
- **Diagnostics too prominent?** Shape identifiers and point counts are inside a closed
  disclosure.
- **Calm?** Neutral background, no tile provider, no third-party request, zoom controls only.

## Limitations

**No train is drawn.** This ticket renders route geometry only; markers are WEB-MAP-3.

**No station markers.** The ticket's scope mentions matching stations, and they are not
drawn: the stops catalog has coordinates, but placing them meaningfully needs the
route-to-stop association that only a trip exposes, and reading that per line is work WEB-MAP-3
is better placed to do alongside markers. Recorded as owed rather than quietly dropped.

**The all-lines view draws 43 alignments, many identical.** The backend reports 21 distinct
geometries among them. Deduplication would halve the payload and is recorded in MARC-506's
outcome as a measured, deliberately deferred option.

Chrome only; not a full accessibility audit.
