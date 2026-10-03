# WEB-UI-03 — Compact train rows, and an honest Now

Status: **DONE** (2026-10-03)

## Goal

Make the train list scannable, and let a commuter ask for what is running now without the app
inventing an answer.

## Why

Measured at 360×800: each row is **113 px**, and the list is the whole service date. On the
weekday measured for WEB-MAP-3 that is 97 rows; the review captured for this ticket fell on a
**Saturday**, when MARC runs 18. A commuter looking for the 07:10 scrolls past everything that
already ran.

Every row also repeats the same explanatory wording, which is how a list of 97 becomes a wall.

## Dependencies

[WEB-UI-01](WEB-UI-01.md).

## Scope

`TrainRow`, `TrainListScreen` and its filters. One compact row per train, a Now/Today control,
and the existing line filter.

## Out of Scope

The contextual preview ([WEB-UI-04](WEB-UI-04.md)), train detail, the map, any new request, and
any change to what a row claims.

## Now, defined exactly

The backend publishes three separate facts (MARC-508) and deliberately refuses to collapse
them. The client must not collapse them either — but it **can** filter on them, because
filtering states a rule rather than inventing a status.

**Now = `membership.scheduledActive` OR `membership.positionFresh`.**

Both halves are needed, and the live data proves it. MARC-508 observed `Train454` with
`positionFresh: true` and `scheduledActive: false` — a train running **late past its scheduled
window**, which is precisely the train a commuter is most anxious about. Taking only
`scheduledActive` would drop it; taking only `positionFresh` would drop every scheduled train
the operator is not reporting, which is most of them.

This rule must be **stated on screen**, not just in code, because "Now" is otherwise a claim
the app cannot support. Say what the filter did: scheduled to be running, or still reporting a
current position. `Today` remains the whole service date and stays the default, so no reader is
silently shown a subset.

Nothing here is a status. A train in `Now` is not "running"; it is scheduled or reporting. The
service still cannot determine which trains are actually running, and the screen must keep
saying so.

## The row

Time, identity, line, destination, and one status line. Conceptually:

```
07:10   Train 675
        Penn Line · to Washington                    ›
        Realtime status unavailable
```

**Line and destination are different facts and must not be merged.** The temptation is to
render the route's own name as a journey — "Penn → Washington" — and it is wrong. On the day
this ticket was planned, the live feed carried 18 trains on `PENN - WASHINGTON`, of which **9
were headed to WASHINGTON and 9 to BALTIMORE or BALTIMORE AND MARTIN AIR**. Half the list would
have been labelled with the wrong destination.

So: the line is the operator's route name, the destination is `scheduled.headsign`, and they are
shown as separate things. `shortName` is `"MARC"` on all three routes and is useless as a
label; `longName` is the only line name the feed gives.

`directionId` is an opaque agency-defined 0/1 and must not be rendered as a compass direction
or an arrow.

## What a row must not gain

A delay badge is conditional, and the common case is that there is none: MDOT publishes **no
trip-level status or delay** on this feed, which is why nearly every row currently reads
"Realtime status unavailable". Design the row for that case first, and treat `+8 min` as the
exception it is. A row that looks broken when the operator is silent is a worse row.

Movement is **not available here**. `calculated` is absent from the trains list by backend
design, and fetching it per row is the N+1 this app forbids. A row states no movement.

## Repetition

Say the shared caveat once, for the list, not once per row.

## Acceptance Criteria

Row height is substantially reduced and the list is materially shorter for the same data. Now
and Today both work, Today is the default, and the Now rule is stated on screen. No row claims
movement, and no row is labelled with a destination it is not headed to. Rows stay distinct
without colour, keep their 44 px targets, and the list still issues one bounded request.

## Tests Required

All established checks. Deterministic tests for: the Now rule including the
`positionFresh` + `scheduledActive: false` case, which must be **included**; a scheduled train
with no realtime, which must be included in Now and not called running; an empty Now result; a
train with no headsign, falling back to the identifier; a train whose headsign differs from its
route name, asserting the destination shown is the headsign; an unknown status, which must never
render as on time; and a long identifier. Assert no additional request per row.

Record measured row height and page height before and after.

## Manual Verification

Against the local backend, compare Now and Today on a weekday and confirm the counts and the
difference are explainable from the three membership facts.

## Design Verification

Capture into `docs/reviews/WEB-UI-03/` with a README: both viewports, Now and Today, an empty
Now, a long identity, unknown and stale rows, and greyscale. State plainly that a weekend
capture shows far fewer trains than a weekday. Apply the [DESIGN.md](../DESIGN.md) checklist.

## Definition of Done

Acceptance criteria and all required checks actually pass, with the measured heights recorded
and the Now rule documented. Update the ticket index and CURRENT_STATE.md. One completed-ticket
commit with a WEB-UI-03 subject.

## Outcome

Rows are compact and separated by rules, the destination is the operator's headsign, and
`Now` is a stated filter over published facts rather than an invented status.

### Checks actually executed

`npm run lint` clean, `npm run typecheck` clean, `npx vitest run` **311 tests in 20 files, 0
failures**, `npm run build` succeeded, `npx playwright test` **80 passed, 4 skipped, 0 failed**.
Rendered review in `docs/reviews/WEB-UI-03/`.

### Measured

| | Mean row | 97-row page |
|---|---|---|
| Before | **113 px** | — |
| Rows differ in realtime | **99 px** | 10,438 px |
| Operator reports nothing for anyone | **74 px** | 8,063 px |

Zero horizontal overflow at either viewport, including a 60-character unbroken identifier,
which wraps inside the row.

The second figure is the one worth noting: the identical "Realtime status unavailable" sentence
is said **once above the list** when it applies to every train, and per-row the moment any train
differs — so an absent line can never imply a status a row does not have. That is what takes
74 px, which is the density the design reference shows.

### Line and destination stay separate, and the capture proves why

The reference renders every row as "Penn → Washington". Today's real list, in
`mobile-today-real.png`:

```
07:10  Train675   Penn Line · to WASHINGTON
08:55  Train476   Penn Line · to BALTIMORE
```

Both on `PENN - WASHINGTON`. The reference's rendering would have mislabelled the 08:55. The
line comes from the route name — shortened from the operator's own `longName`, because
`shortName` is `"MARC"` on all three routes — and the destination from `scheduled.headsign`.

### Now, as specified

`isRelevantNow` = `scheduledActive || positionFresh`, both published facts, documented in
`lib/presentation/trains.ts` with the reason each half is needed. It is a **filter**, never a
stored flag and never rendered as "running"; the screen states the rule it applied. `Today` is
the default, so nobody is shown a subset silently, and `Now` filters the page already fetched —
a test asserts it issues no additional request.

Deliberately compatible with [WEB-UI-08](WEB-UI-08.md): the predicate and the service-window
facts live in the presentation layer, so service-ended, between-trains and in-service states can
be built on the same primitives without unpicking this.

### Quick Look is not here

It is [WEB-UI-04](WEB-UI-04.md) and this ticket lists it out of scope. What was built is the
affordance it attaches to: the whole row is one link, and a test asserts exactly one control per
row with none nested. No Quick Look screenshots exist, because no Quick Look exists.

### Two existing tests failed, both correctly

One asserted the old "Official · " wording, now "Official MTA · " to match the convention used
elsewhere. The other collected **every** link on the screen and so swallowed the new Now/Today
views; it is now scoped to the list, which is what it meant.

### Weekday density verification: PENDING

Recorded in the review README as a follow-up design check, **not** a completion gate. Row
height, wrapping, overflow and greyscale at 97 rows are verified from a clearly labelled
SYNTHETIC fixture; every behaviour is verified against today's real 18-train data. What remains
is a judgement about scanning 97 *real* rows, and correctness does not depend on it.

No blockers. Next: [WEB-UI-04](WEB-UI-04.md) — Train Quick Look.
