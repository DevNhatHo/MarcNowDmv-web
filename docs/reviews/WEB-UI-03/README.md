# WEB-UI-03 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend on
**Saturday 2026-10-03**, with `cmd/ingest` polling.

## What is real and what is SYNTHETIC

| File | Data |
|---|---|
| `mobile-today-real.png`, `desktop-today-real.png` | **Real.** Today's 18 scheduled MARC trains |
| `mobile-now-real.png`, `desktop-now-real.png` | **Real.** The Now view over the same page |
| `*-SYNTHETIC-weekday-none-reported.png` | **SYNTHETIC.** 97 generated rows, no realtime on any |
| `*-SYNTHETIC-weekday-mixed-realtime.png` | **SYNTHETIC.** 97 generated rows, realtime on one in three |
| `*-SYNTHETIC-long-text.png` | **SYNTHETIC.** A 60-character unbroken identifier and a long headsign |
| `*-SYNTHETIC-grayscale.png` | **SYNTHETIC.** The same, colour removed |

The SYNTHETIC rows are produced by `syntheticWeekdayList` in `tests/fixtures/synthetic.ts`:
real captured rows repeated on a generated clock with `SYNTHETIC` identifiers. **No MARC train
ran at those times and none of it was observed.** It exists to judge density at weekday volume
without waiting for a weekday, and must never be described as live service.

## Measured

| | Rows | Mean row | Page |
|---|---|---|---|
| **Before this ticket** | — | **113 px** | — |
| Real, Today, mobile | 18 | **103 px** | 2,680 px |
| Real, Today, desktop | 18 | **99 px** | 2,421 px |
| Real, Now, mobile | 1 | 99 px | 934 px |
| SYNTHETIC 97, none reported | 97 | **74 px** | 8,063 px |
| SYNTHETIC 97, mixed realtime | 97 | 99 px | 10,438 px |
| SYNTHETIC long text, mobile | 8 | 110 px | 1,717 px |

Horizontal overflow is **0** in every case, including the long-identifier row, which wraps
inside the row rather than widening it.

**113 px → 99 px** when rows differ, and **113 px → 74 px** when the operator reports nothing
for anyone, because the identical status sentence is then said once above the list instead of
97 times. 74 px is the density the design reference shows.

## The honesty point, visible in the capture

`mobile-today-real.png` rows one and two:

```
07:10  Train675   Penn Line · to WASHINGTON
08:55  Train476   Penn Line · to BALTIMORE
```

Both are on `PENN - WASHINGTON`. The design reference renders every row as "Penn → Washington",
which would have labelled the 08:55 with the wrong destination. The line comes from the route
name and the destination from `scheduled.headsign`, and they are never joined.

## Quick Look

**Not implemented here.** Quick Look is [WEB-UI-04](../../tickets/WEB-UI-04.md), and this ticket
lists it out of scope. What exists is the affordance it will attach to: the whole row is one
link to the train's page, with a chevron, and a test asserts each row contains exactly one
control and no nested one. There are no Quick Look screenshots because there is no Quick Look.

## PENDING LIVE WEEKDAY DENSITY VERIFICATION

**Not yet done.** A capture of `/trains` on a normal weekday service date, at both viewports,
with the real ~97-train schedule.

- **Already verified:** row height, page height, wrapping, overflow and greyscale legibility at
  97 rows, from the SYNTHETIC fixture; and every behaviour against today's real 18-train data.
- **What the weekday capture adds:** whether 97 *real* rows — with real identifiers, real
  headsign lengths, and whatever mix of realtime the operator is publishing — are comfortable
  to scan. That is a judgement about legibility, not about correctness.
- **Correctness does not depend on it.** Every data-trust rule is covered by deterministic
  tests, and the real-data captures above show the rendering on genuine service.

Recorded as a follow-up design check, not a completion gate: the ticket's Definition of Done
requires measured heights and the documented Now rule, both present, and its Design Verification
explicitly anticipated a weekend capture.

## Checklist findings

Scannable in five seconds: yes — time, identifier, line and destination in a fixed column
order. Cards: gone; rows are separated by rules. Repetition: the shared caveat is said once
when it applies to everything. Colour: the status mark is accompanied by its words and survives
greyscale. Density: 74–99 px per row against the reference's roughly 74.

## Limits

Full-page mobile captures paint the `position: fixed` bottom navigation once at its scroll
position, so it appears part-way down the content. It does not do that in the browser.

Today's Now view contains a single train, which is a real Saturday-morning result and not a
demonstration of a busy Now. Greyscale is a colour-blindness proxy, not assistive-technology
testing.
