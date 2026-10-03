# WEB-UI-08 — Pulse service-state awareness

Status: NOT_STARTED

## Goal

Make Pulse say what the railway is actually doing right now — running, between trains, or
finished for the night — instead of reporting zero against a schedule.

## Why

At 01:40 on 2026-10-03 the real app said "0 of 18 trains report a current position". That is
true and it reads like a broken service. MARC had simply stopped for the night.

The [reference](../design-reference/pulse-by-time-of-day.png) shows the fix: three states, each
with the one thing a commuter wants next. It is the reference's strongest product idea, not a
visual one.

## Dependencies

[WEB-UI-01](WEB-UI-01.md). Sequenced **before** [WEB-UI-06](WEB-UI-06.md) so the review judges
the finished Pulse.

## Scope

A service state derived from the schedule, and the Pulse presentation of each state.

## Out of Scope

Any new endpoint, any backend change, predicting whether a train will run, counting "active"
trains as one flag, and the desktop composition ([WEB-UI-07](WEB-UI-07.md)).

## The three states, and what each may claim

Derived from `scheduled.start`/`end` across the service date and the three `membership` facts —
**all timetable and published facts, no inference**.

| State | When | May say | May never say |
|---|---|---|---|
| **Service ended** | no scheduled run remains today | the next scheduled departure, with its time and line | that service "will" resume — the schedule says it is booked to |
| **Between trains** | runs remain but none is within its window | time until the next scheduled departure | that no train is moving; an unreported train is not an absent one |
| **In service** | at least one run is within its window, or reporting fresh | counts of scheduled runs, of runs reporting a fresh position, and of runs with a published delay | that *N* trains "are running" — the service cannot determine that |

**The counts are the trap.** The reference shows "5 trains active (now or recently)", and
`active` is precisely the single boolean MARC-508 refused to publish because its three facts
disagree. Each tile must name the fact it counts: scheduled today, reporting a current position,
and — only when the operator published one — reported delayed. A zero in any of them is a fact
about *reports*, not about trains.

## Time, carefully

The state depends on the clock, so it must be evaluated against the response's own
`evaluatedAt` rather than the browser's wall clock, and in the schedule version's timezone. A
service date crosses midnight; "ended for tonight" at 01:40 means the previous service day is
finished, and the next departure may belong to the next one.

## Acceptance Criteria

Pulse shows the right state at 02:00, 08:00 and 17:00 on a weekday and at the same times on a
Saturday. Each state names its next useful action. No count is labelled "active" and every count
names what it counts. Nothing claims a train is running. The uncertainty explanation stays
available behind its disclosure. The state is distinguishable without colour.

## Tests Required

All established checks, on deterministic fixtures with a fixed clock. Cover: before the first
departure; between two runs; during a run; after the last run; a service date crossing midnight;
a day with no scheduled service at all; every train scheduled but none reporting; and a train
reporting fresh outside its scheduled window, which must not flip the state to ended.

Assert no response field is read that the list does not already carry, and that no extra request
is made.

## Manual Verification

Against the local backend at three real times of day, including after the last train. Record the
actual clock times observed.

## Design Verification

Capture into `docs/reviews/WEB-UI-08/` with a README: all three states at both viewports, and
greyscale. Synthetic clocks must be labelled **SYNTHETIC**; real captures must state the real
time they were taken. Apply the [DESIGN.md](../DESIGN.md) checklist.

## Definition of Done

Acceptance criteria and all required checks actually pass, with the observed times recorded.
Update the ticket index and CURRENT_STATE.md. One completed-ticket commit with a WEB-UI-08
subject.
