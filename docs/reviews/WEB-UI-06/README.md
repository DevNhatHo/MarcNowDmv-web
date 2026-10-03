# WEB-UI-06 — cross-device review, closing the UI milestone

Production build, system Chrome, against the local backend on **Saturday 2026-10-03**.
26 captures. **Real data** except where a state had to be forced.

| Group | Files |
|---|---|
| Every screen, three widths | `{mobile,tablet,desktop}-{pulse,trains,map,alerts}.png` |
| Text at 200% | `*-trains-200pc-text.png` |
| Greyscale | `*-trains-grayscale.png` |
| Backend unreachable | `mobile-*-backend-unreachable.png` |
| Reduced motion | `mobile-map-reduced-motion.png` |

## Measured, every screen at 360, 768 and 1280

| | Result |
|---|---|
| Horizontal overflow | **0** everywhere |
| First-level headings | **exactly 1** everywhere |
| Overflow at 200% text | **0** everywhere |
| Page errors | **none** |

## A regression this review caught

`/trains` overflowed by **155 px at 200% text** on a 360 px viewport — a WCAG 1.4.10 reflow
failure. The filter row measured 505 px inside a 360 px screen, because a date input carries an
intrinsic width that doubles with the text size and the fields could not shrink.

The existing zoom test did not catch it: it checks `/` only. The fields now shrink and the
Now/Today control wraps, and the figure is 0 at all three widths.

Worth noting for later tickets: `fontSize: 200%` and `zoom: 200%` disagree slightly — 155 px
against 177 px here — and the suite's established method is the former.

## The ten questions

1. **Primary information in five seconds** — yes. Pulse opens with the service state, the list
   with time and destination, the map with the map.
2. **Anything removable** — the operator's full advisory text and the geometry statistics were
   removed from first view and put behind disclosures. Nothing further stands out.
3. **Duplicated information** — the identical per-row status sentence is now said once for the
   list, and the quick look and map panel render one shared component.
4. **Whitespace instead of a card** — train rows and advisories are rules and spacing now.
   Cards remain only where they group something.
5. **Most important status dominant** — the service state leads Pulse; the scheduled time leads
   a row.
6. **Stale distinct from healthy** — yes, and by words first: the greyscale captures show
   "Last known position" and "Current position" distinguishable with no colour at all.
7. **Official distinct from MARC Now** — every calculated value is prefixed `MARC Now ·` and
   every official one `Official MTA ·`.
8. **Mobile feels natural** — bottom navigation, bottom sheets, compact rows, no horizontal
   scrolling.
9. **Sensible without colour** — yes; see the greyscale captures.
10. **Technical detail too early** — shape identifiers, alignment totals and schedule versions
    are all behind `Map data details`.

## Still open, recorded rather than fixed

**PENDING LIVE WEEKDAY DENSITY VERIFICATION.** Every capture here is a Saturday with 18
scheduled trains against a weekday's 97. Density at weekday volume is verified from a labelled
SYNTHETIC fixture in `docs/reviews/WEB-UI-03/`, not from live service. Correctness does not
depend on it; legibility at 97 real rows is the open question. The same applies to the map's
marker density and to the home composition's trains panel, which shows a single row today.

**A fresh-position capture.** No MARC train was reporting a fresh position for most of this
session, so the quick look and map sheet captures show last-known positions. Moving and
stationary states are covered by deterministic tests only.

**An overnight capture** of the real service-ended state, which was forced synthetically.

## An honest note on the suite

One full `npx playwright test` run failed on `the map claims nothing about movement`: the
attribution element was not found within 60 s, so the map had not initialised. The next full
run passed **84/84**. The cause is contention — more specs now load maps, and four workers
compete for the backend's four-connection pool and for tiles. Recorded as an observed flake.

## Limits

Greyscale is a colour-blindness proxy, not assistive-technology testing. The axe and 44 px
floors are asserted by `tests/e2e/accessibility.spec.ts` at both required viewports, not by
these images. Tablet width is included here but is not one of the project's two required
review viewports.
