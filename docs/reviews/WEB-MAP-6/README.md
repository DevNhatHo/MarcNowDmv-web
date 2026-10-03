# WEB-MAP-6 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend on the
retained `marc_208_live` database. Real published MARC geometry; no synthetic fixture.

| File | Shows |
|---|---|
| `mobile-map-all-lines.png`, `desktop-map-all-lines.png` | All 43 alignments on the OpenFreeMap vector basemap |
| `mobile-map-one-line.png`, `desktop-map-one-line.png` | The line filter applied |
| `mobile-map-grayscale.png`, `desktop-map-grayscale.png` | The alignment still legible with colour removed |

Measured in the same pass: **275 kB gzipped** map-route bundle, **15** basemap requests at
360×800 and **20** at 1280×900, **0** on any screen without a map, and **0–2** per line filter.

Nothing here claims anything about a train. These are route alignments only.

## Limits

A basemap is a third-party rendering that can change without notice; these images record how
it looked on 2026-10-01, not a guarantee. Greyscale is a colour-blindness proxy, not a
substitute for testing with assistive technology.
