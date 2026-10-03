# WEB-UI-08 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend on
**Saturday 2026-10-03**.

| File | Data |
|---|---|
| `mobile-real-now.png`, `desktop-real-now.png` | **Real.** The state at roughly 13:00 EDT |
| `*-SYNTHETIC-in-service.png` | **SYNTHETIC.** Forced in-service |
| `*-SYNTHETIC-between-trains.png` | **SYNTHETIC.** Forced gap, 36 minutes to the next departure |
| `*-SYNTHETIC-ended.png` | **SYNTHETIC.** Forced end of service |
| `*-SYNTHETIC-grayscale.png` | **SYNTHETIC.** The same without colour |

The synthetic pages move scheduled windows around a fixed `evaluatedAt` of `2026-10-03T17:00Z`
so each state can be captured on demand. **No MARC train ran at those times** and the rows are
labelled `SYNTHETIC` in the identifiers. Only the `real-now` captures are observed service.

## What each state says

| State | Headline | Detail |
|---|---|---|
| In service | `MARC is in service` | `Trains are scheduled or reporting. This service cannot determine how many are actually running.` |
| Between trains | `No MARC train is inside its scheduled window right now` | `The next scheduled departure is in 36 min. A train the operator is not reporting is not an absent train.` |
| Ended | `MARC service has ended for today` | `No further departure is scheduled on this service date.` |

The real capture reads: **Scheduled today 18 · Reporting a current position 1 · With a delay the
operator published 0.**

## The counts name what they count

The design reference shows **"5 trains active (now or recently)"**. `active` is precisely the
boolean MARC-508 refused to publish, because its three facts disagree. So there is no active
count here. Each tile names its own fact, and the "in service" headline carries no number at
all — a test asserts it contains no digit.

`With a delay the operator published` reads **0** on real data, which is correct: MDOT publishes
no trip-level delay on this feed. Designing a tile that looks broken at zero would have been the
easy mistake.

## Why this ticket exists

At 01:40 on 2026-10-03 this screen said *"0 of 18 trains report a current position"*. True, and
it reads like a broken service rather than a sleeping railway.

## Limits

The three forced states are **synthetic**; only the in-service state was observed live, because
the captures were taken mid-afternoon. An overnight capture of the real ended state is worth
taking and has not been.

Greyscale is a colour-blindness proxy. The state is carried by its headline first and a tinted
left border only reinforces it, which the greyscale capture confirms.
