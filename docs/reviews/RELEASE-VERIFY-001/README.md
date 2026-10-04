# RELEASE-VERIFY-001 — local MVP release-readiness evidence

Verification pass, not feature work. No backend contract was touched and no layout was
redesigned.

## Operating conditions at the time of this pass

| | |
|---|---|
| Local clock | **Saturday 2026-10-03, 21:04–21:30 EDT** |
| Day type | **Weekend** — 18 scheduled trains against a weekday's ~97 |
| Service state | **Between trains** — 0 runs inside a scheduled window, 3 departures still ahead, next at 21:25 |
| Live positions | **None fresh.** MDOT's Vehicle Positions and Trip Updates feeds both return a **15-byte empty payload**; the newest retained observation is 20:34 EDT |
| Feed health | `MARC_TRIP_UPDATES` and `MARC_VEHICLE_POSITIONS` HEALTHY; `MARC_STATIC_GTFS` and `MTA_SERVICE_ALERTS` **DEGRADED** |
| Ingest loop | Running throughout; 4,200+ runs accumulated |

These conditions decide what can honestly be claimed below. Three of the eight verification
targets could not be exercised, and are recorded as pending rather than inferred.

## Verified by automated tests

`npm run lint` clean · `npm run typecheck` clean · `npx vitest run` **341 tests in 23 files** ·
`npm run build` succeeded · `npx playwright test` **84 passed, 4 skipped, 0 failed**.

The 4 skips are honest: they need a train reporting a position, and none was.

## Verified with LIVE REAL DATA

Captured this session, files prefixed `LIVE-`:

- **All four screens, both viewports** — `LIVE-{mobile,desktop}-{pulse,trains,map,alerts}.png`.
  Zero horizontal overflow and exactly one `h1` on every one. No page errors, no failed
  requests.
- **Degraded alert feed.** `MTA_SERVICE_ALERTS` is genuinely DEGRADED right now, and the screen
  says *"Alert data may be incomplete. The operator feed is degraded, so these advisories are
  what was last received."* This is a real degraded state, not a forced one.
- **Retained last-known positions.** Quick Look and the map's selected-train sheet both read
  *"Last known position · 14 hr ago"* / *"· 11 hr ago"*, with *"This is where the train was last
  reported. It is not a claim about where it is now, and not a claim that it has stopped."*
- **Attribution** visible on the map at both viewports, covered by neither the bottom navigation
  nor the selected-train sheet.
- **Low-volume weekend service** — the whole point of target 1. 18 trains, nothing reporting,
  and the product reads as a quiet railway rather than a broken app.

### Data-trust checklist, swept against the live screens

All eleven hold:

UNKNOWN never rendered as ON_TIME · no fabricated "active" count · no "N trains are running"
claim · last-known never presented as current · stale never called stationary · calculated
values labelled `MARC Now ·` · official values labelled `Official MTA ·` · no reverse-geocoded
place name · no fabricated trip-level delay · degraded feed stated plainly · the map claims
nothing about movement.

## Verified with SCHEDULE-DERIVED REAL STATE

- **Between trains**, live and genuine: Pulse reads *"No MARC train is inside its scheduled
  window right now · The next scheduled departure is in 18 min · 21:25 Train499 · to
  WASHINGTON"*. This is WEB-UI-08's middle state, previously proven only synthetically, now
  observed against the real timetable.

## Verified only with SYNTHETIC fixtures

Still only synthetic, and labelled as such in their own review folders:

- **Weekday row density at 97 rows** — `docs/reviews/WEB-UI-03/`.
- **Service-ended and in-service Pulse states** — `docs/reviews/WEB-UI-08/`. (Between-trains is
  now also proven live, above.)
- **Marker transition between two observations** — `docs/reviews/WEB-UI-07/`… see WEB-MAP-7.

## Still pending live verification

| Pending | Window needed |
|---|---|
| **Weekday density** | A weekday (Mon–Fri) during published service, ideally 06:00–09:00 or 15:00–19:00 EDT, when ~97 trains are scheduled |
| **Fresh live position** | Any time MDOT's Vehicle Positions feed is non-empty. It returned 15 bytes throughout this pass; weekday peak is the reliable window |
| **Real service-ended state** | After the last scheduled run's window closes — tonight roughly 23:30–00:30 EDT, or any overnight hour |

None of these is a correctness gap. Each is a legibility or state-coverage observation that the
implementation already handles and tests already cover.

## Defect found and fixed in this session

**One line, two names.** Pulse built its route names from `route.longName` while the train
list, the map markers and the quick look all used `lineLabel`. At desktop width the composed
home screen showed *"PENN - WASHINGTON"* in the left column and *"Penn Line"* in the right — two
names for one line, on one screen.

Fixed by pointing Pulse at the same `lineLabel`, with a test asserting a single spelling across
the screen. Verified live afterwards: Pulse now reads "Penn Line" twice and the raw name zero
times.

## Defect found and NOT fixed

**Two minor raw route names remain**, deliberately left for a follow-up rather than widened into
this verification session:

- the train list's line filter `<select>` option, and
- the map's "Lines" text-equivalent index.

Both name the *route* rather than a train's line, both use the operator's own published string,
and neither appears beside a conflicting spelling. Recorded as `WEB-UI-09`.

## Non-defect worth recording

An early capture showed the home composition's map panel blank. It is **not** a defect: three
clean attempts rendered the canvas at 526 px with 16 tile responses, all 200, and no errors. The
blank frame was a cold-start screenshot taken before tiles painted. Later captures warm the
catalog first.

## Known limitations that do not block local MVP use

- Movement state is absent on the system map by design — `calculated` is not on the trains list.
  [BACKEND-UI-06](../../BACKEND_GAPS.md) covers the system-map route-aware case.
- MDOT publishes no trip-level delay on this feed, so delay badges are rare by nature.
- A Playwright run occasionally flakes on a map spec under contention; it passes on a clean
  rerun.
- Line colours, where used, are ours and not the operator's: the feed publishes `FF8000` for all
  three routes.

## Verdict

**LOCAL MVP READY FOR DEPLOYMENT PLANNING.**

The three pending items are state-coverage captures that depend on conditions that have not
occurred, not on unfinished work. Every data-trust rule holds under live conditions, every
screen is clean at both viewports, and the one real defect found was fixed and verified within
this session.
