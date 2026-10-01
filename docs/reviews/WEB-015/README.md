# WEB-015 live service verification

## Exact conditions

| | |
|---|---|
| Observed | **Wednesday 30 September 2026, 22:23–22:50 EDT** |
| Service date | `20260930` |
| Database written to | **`marc_208_live`** — the retained review database, so data later reviews were captured against has changed |
| Ingestion | `cmd/ingest` in a loop at 28-second intervals |
| Backend | `cmd/api` at 127.0.0.1:8080; frontend production build at localhost:3000 |
| Trains reporting | **2** |
| Vehicle Positions payload | 173 bytes |

**This was evening service, not a weekday peak.** The ticket's scope asked for a peak; two
trains at 22:40 is what was available. Everything below is reported against that.

## What was observed live, for the first time

| Object | Live state | Evidence |
|---|---|---|
| observedMovement | **MOVING** | both reporting trains, 2 observation ids each, 0 rejected |
| routeProgress | **MEASURED** | 81,078 m along the shape |
| nextStop | **IDENTIFIED** | Aberdeen, distance decreasing 5.9 km → 4.9 km between captures |
| officialDelayTrend | **STABLE** | measured at Union Station's departure |
| Official stop delay | **2 min 27 sec early at ABERDEEN MARC nb** | per-stop, named |
| Destination | **PERRYVILLE** | from the departures endpoint |

The distance to the next stop fell from 5.9 km to 4.9 km between the mobile and desktop
captures, because the loop re-ingested and the train had genuinely moved. That is the
clearest single piece of evidence that the pipeline is live end to end.

Movement only reads MOVING when two positions arrive **within the backend's 60-second gap
threshold**. Ingests minutes apart produce UNKNOWN, correctly. A polling loop is therefore
not a convenience here — it is what makes movement observable at all.

## States still not observed

- **STATIONARY.** It needs repeated nearby positions across a station dwell. Two trains in
  motion at 22:40 never produced one.
- **A trip-level ON_TIME, DELAYED or CANCELED.** MDOT publishes no trip-level status at all,
  which is the WEB-013 finding. This may never be observable from this feed.
- **Peak-scale behaviour.** Dozens of simultaneous trains, mixed fresh and stale positions,
  and the Pulse summary with genuine reported coverage were not seen.

These remain covered by unit tests over captured and clearly labelled synthetic fixtures, and
the affected tickets now say exactly this rather than "never observed".

## Checks executed

`npm test` — 13 files, 192 tests. `npm run lint`, `npm run typecheck`, `npm run build`.
`npx playwright test` — **46 tests, 23 per viewport, all passing** against live changing data.

## A flake worth recording

On the first live run, two integration specs failed — the Pulse summary and the list
pagination — and passed on rerun, with the full suite green twice afterwards. The loop was
ingesting throughout, so a poll landing between a count and its assertion is the likely
cause.

It is recorded rather than written off: a suite that is green only when nothing is changing
underneath it is weaker than it looks. The specs assert behaviour rather than fixed values,
so the fix is tolerance for content changing mid-assertion, not pinning the data.

## Screenshots

`*-pulse.png`, `*-trains.png`, `*-alerts.png`, `*-detail-moving.png` and
`*-detail-moving-grayscale.png`, at 360×800 and 1280×900. All show **live data**, not
fixtures; none is synthetic.
