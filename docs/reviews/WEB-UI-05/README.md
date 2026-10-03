# WEB-UI-05 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend on
**Saturday 2026-10-03**. **Real data.**

| File | Shows |
|---|---|
| `mobile-system.png`, `desktop-system.png` | The map dominant, with line chips above it |
| `*-line-filtered.png` | One line selected from the chips |
| `*-selected-train.png` | The selected-train sheet attached below the map |
| `*-attribution-with-sheet.png` | The OSM attribution, scrolled into view, with the sheet open |
| `*-grayscale.png` | The same with colour removed |

## Measured

| | Mobile | Desktop |
|---|---|---|
| Map share of viewport | **72%** | **72%** |
| Horizontal overflow | 0 | 0 |
| `Map data details` open by default | **no** | **no** |
| Attribution visible with the sheet open | **yes** | **yes** |
| Attribution covered by the sheet | **no** | **no** |
| Attribution covered by the bottom navigation | **no** | **no** |

Previously the map was 60vh behind a labelled form.

## A deviation from the reference, and why

The reference shows the selected-train sheet **overlapping** the map's lower edge. It is not
done that way here. The OpenStreetMap and provider attribution lives at the bottom of the map
frame, and covering it is a licensing problem rather than a layout preference.

The sheet is instead attached directly beneath the map with a rounded top and a light shadow,
which reads as attached without hiding anything. The measurements above are the evidence, taken
with the sheet open and the attribution scrolled into view.

## What did not change

The renderer, its sources and layers, the follow rules and the transition rules are untouched.
The whole existing map suite passes unmodified except for one test that drove the old
`<select>`; it now clicks a chip, which is the same assertion about the same behaviour.

The selected-train sheet renders the same `TrainFacts` component as the quick look, so there is
no third description of a train in the app.

## A measurement artifact worth recording

An automated probe reported `Map data details` as open. It was not: `document.querySelector
("details")` matched **MapLibre's own attribution control**, which is a `<details>` and is open
in its expanded state. Enumerating them shows the real order — attribution (open), the
unreported-trains disclosure (closed), `Map data details` (closed). The same ambiguity broke an
integration test during WEB-UI-05's predecessor, and it is worth knowing that `details` is not a
unique selector on this screen.

## Limits

No train was reporting a **fresh** position at this hour on a Saturday, so the selected-train
captures show a last-known position. A fresh selection, a moving train and a stationary train
are covered by deterministic tests, not by these images — the same gap already recorded as the
pending weekday capture for WEB-UI-03.

Full-page mobile captures paint the fixed bottom navigation once at its scroll position.
Greyscale is a colour-blindness proxy, not assistive-technology testing.
