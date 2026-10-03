# WEB-UI-07 — rendered review

Production build, system Chrome, against the local backend on **Saturday 2026-10-03**.
**Real data.**

| File | Width | Shows |
|---|---|---|
| `desktop.png` | 1280 | Status left, map centre, trains right |
| `wide.png` | 1600 | The same at a wider viewport |
| `below-breakpoint.png` | 1000 | The unchanged single column, just under 64rem |
| `mobile.png` | 360 | The unchanged single column |
| `desktop-grayscale.png` | 1280 | The composition without colour |

## Measured

| | 1280 | 1600 | 1000 | 360 |
|---|---|---|---|---|
| Map panel | yes | yes | **no** | **no** |
| Trains panel | yes | yes | **no** | **no** |
| Map panel width | 528 px | 640 px | — | — |
| `h1` count | 1 | 1 | 1 | 1 |
| Horizontal overflow | 0 | 0 | 0 | 0 |

Backend requests per load:

| Resource | ≥64rem | <64rem |
|---|---|---|
| trains | 1 | 1 |
| routes | 1 | 1 |
| alerts | 1 | 1 |
| shapes | 1 | **0** |
| stops | 1 | **0** |

**Each resource is read exactly once**, and the composition adds only the geometry a map needs.
The trains panel issues nothing at all — it renders the page the Pulse screen already fetched.
Below the breakpoint the panels are **not rendered**, so a phone pays nothing for them.

## Two defects this review caught

**The map column collapsed to about ten pixels.** The Pulse screen is a 45rem reading column,
and three panes cannot fit in it — the first capture shows "Open the full map" rendering one
letter per line. The screen now widens to the viewport at desktop width, centred against its
narrower parent with a negative margin. The map panel measures 528 px at 1280 and 640 px at
1600.

**The catalog was read twice.** The map panel fetched routes while the Pulse screen already
had them, so composing two screens cost more than either. The panel now takes routes as a prop,
and a test asserts exactly one catalog read.

## What it does not do

Selection, focus and follow stay on `/map`; the panel links there rather than reimplementing
them. All four dedicated routes remain reachable and complete. No business logic is duplicated:
the rows are the list's `TrainRow`, the markers are the map's own presentation, and the "relevant
now" rule is the same `isRelevantNow` the list uses.

The trains panel says what it selected — "Scheduled to be running now, or still reporting a
position" — and never that a train is running.

## Limits

The capture is a Saturday with 18 scheduled trains and one relevant now, so the trains panel
shows a single row. **A weekday capture would fill it**, and that is part of the pending
weekday verification already recorded for WEB-UI-03.

The composition appears after hydration, because the server cannot know the viewport width; the
server snapshot is deliberately "narrow". Greyscale is a colour-blindness proxy, not
assistive-technology testing.
