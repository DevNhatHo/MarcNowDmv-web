# WEB-004 rendered review

Production build served by `npm start`, inspected in installed Chrome at the two viewports
the design plan requires. Screenshots in this directory are the evidence; measurements
below were read from the live DOM, not estimated.

## Screenshots

| File | What it shows |
|---|---|
| `mobile-pulse.png`, `mobile-trains.png`, `mobile-alerts.png` | 360×800, each destination |
| `desktop-pulse.png`, `desktop-trains.png`, `desktop-alerts.png` | 1280×900, each destination |
| `mobile-skip-link-focused.png`, `desktop-skip-link-focused.png` | first tab stop, skip link revealed and focused |
| `mobile-nav-focused.png`, `desktop-nav-focused.png` | second tab stop, the brand link focused |
| `mobile-zoom-200.png`, `desktop-zoom-200.png` | 200% root font size |
| `mobile-grayscale.png`, `desktop-grayscale.png` | grayscale, for colour independence |

## Measurements

| Measurement | Mobile (360×800) | Desktop (1280×900) |
|---|---|---|
| Horizontal page overflow | 0 px | 0 px |
| Navigation target heights | 44 / 44 / 44 px | 44 / 44 / 44 px |
| Main content width | 360 px | 960 px (capped by `--width-content`) |
| `h1` elements per page | 1 | 1 |
| Current link weight / decoration | 600 / underline | 600 / underline |
| Skip-link focus outline | 3 px | 3 px |
| `--motion-duration` under reduced motion | 0s | 0s |

The footer string was read from the DOM and compared character for character with the
wording the design plan requires. It matches, and appears exactly once per page.

## Defect found and fixed by looking

At 200% zoom on a 360 px viewport the navigation labels broke **mid-word** — "Puls/e",
"Train/s", "Alert/s". The automated checks all passed, because there was no horizontal
overflow; only the rendered view showed it. The cause is the WEB-002 global
`overflow-wrap: anywhere`, which is needed so a long opaque train identifier cannot
overflow, but is wrong for a short label. The navigation links and the brand now set
`overflow-wrap: normal` and the list wraps between items instead. The re-captured
`*-zoom-200.png` show whole labels wrapping onto a second line.

## Design checklist

- **What dominates?** The page `h1` and the "Not built yet" status. Nothing competes.
- **Understandable in five seconds?** Yes: destination name, then a plain statement that
  the screen is unfinished.
- **Anything removable or duplicated?** The starter's own affiliation disclosure was
  removed, because the footer now carries that wording; it appeared twice otherwise.
  `app/page.module.css` was deleted with the starter layout it styled.
- **Severity appropriate?** No status colour is used anywhere in the shell. A placeholder
  has no operational severity to express, so claiming one would be dishonest.
- **Unknown distinct from healthy?** The placeholders state that emptiness is *not* an
  operational claim: "An empty screen at this stage means the screen is unfinished, not
  that no trains are scheduled", and for alerts, "not evidence that there are no
  disruptions". A unit test asserts the Pulse placeholder contains no digit at all, so
  nothing can be misread as a count, a delay or a time.
- **Official distinct from calculated?** Not applicable: the shell presents no data.
- **Does mobile work naturally?** Yes; the header wraps to two rows and the content is a
  single column with no horizontal scroll.
- **Without colour?** Yes. The current destination is carried by weight and a persistent
  underline together; the grayscale captures confirm it.
- **Diagnostics too prominent?** None are shown.
- **Calm?** Yes: one border, no shadow, no accent surface, no motion.

## Limitations

This is a rendered review in one browser, not a full accessibility audit and not a
screen-reader certification. Loading, error and real-data states are **not applicable**:
the shell performs no fetch, and no screen consumes the WEB-003 client yet. Those states
belong to WEB-005, WEB-008 and WEB-009, which own the screens that load data. Only Chrome
was inspected; no other engine was checked.
