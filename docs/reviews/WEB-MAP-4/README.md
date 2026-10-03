# WEB-MAP-4 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend with
`cmd/ingest` polling. **Real observations.**

| File | Shows |
|---|---|
| `mobile-focus.png`, `desktop-focus.png` | A focused train: its marker and its own alignment emphasised, everything else dimmed, with the panel |
| `*-focus-grayscale.png` | The emphasis surviving with colour removed |

The captured train reported `Current position · just now`, `Reported heading 202°`, `MARC Now ·
observed movement — Moving`, next stop `UNION STATION MARC Washington`, and `0 m along a
64.4 km route · 0%`. Movement and progress come from the one detail request a selection makes.

## Limits

Reduced motion is honoured by moving the camera instantly rather than easing. That is in the
code path and is **not** asserted by an automated test: the resulting duration is internal to
MapLibre and not observable from the page. Follow behaviour over successive observations is
covered by unit tests on `followTarget`, not by these stills.
