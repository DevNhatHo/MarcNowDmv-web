# WEB-MAP-7 — Smooth transitions between observed positions

Status: NOT_STARTED

Sequencing note: this runs **after [WEB-MAP-4](WEB-MAP-4.md) and before
[WEB-MAP-5](WEB-MAP-5.md)**, despite its number, so WEB-MAP-5's integration review judges the
finished behaviour rather than signing off a map that then gains animation. WEB-MAP-6 is DONE
and is not reopened; renumbering shipped tickets would break the record of what shipped.

## Goal

Make the map feel live between feed updates without ever implying the backend knows more than
it does.

## Why

MARC publishes a new Vehicle Position roughly every 30–60 seconds. Snapping a marker from one
point to the next is correct but visually rough, and the map reads as a slideshow rather than
a live picture.

The risk is the whole point of the ticket. The obvious fix — estimate velocity and keep the
marker rolling until the next update — fabricates a position and presents it as live. This
project's entire contract design exists to prevent exactly that. So the transition is bounded
at both ends by real observations, and stops.

## Dependencies

[WEB-MAP-3](WEB-MAP-3.md) for the marker layer and [WEB-MAP-4](WEB-MAP-4.md) for focus. The
[live movement addendum](../MAP_PLAN.md) is the governing specification.

## Scope

A presentation-only transition between the two most recent observed positions of a train,
applied to markers that already exist, with route-aware motion where the contract supports it.

## Out of Scope

**Any extrapolation past the latest observation** — this is the hard rule, not a preference.
Also: velocity or heading-based projection, predicted arrival positions, changing any backend
claim, animating stale markers, inventing movement state, per-train requests, and the
system-map route-aware case, which is blocked on
[BACKEND-UI-06](../BACKEND_GAPS.md) and must not be worked around in the browser.

## Expected Files

`components/map/` marker and animation code, shared presentation for freshness/movement text,
deterministic fixtures, marker-animation tests, `docs/` updates.

## The hard rule

```
OFFICIAL POSITION A  →  presentation transition  →  OFFICIAL POSITION B  →  stop
```

The marker transitions **to** the newest observation and then **remains there** until a newer
valid observation arrives. It does not continue, drift, coast or ease past it. Interpolated
coordinates are never recorded as an observation, never shown as one, and never used to derive
freshness, movement, progress or next stop.

## Implementation Notes

**Trigger.** A transition starts only when a strictly newer `position.sourceTimestamp` arrives
for a train that already has a rendered position. A first observation places the marker with no
transition. An older or equal timestamp does nothing.

**Duration.** Bounded and shorter than the polling cadence, so a transition always finishes
before the next observation can arrive; a still-running transition is replaced by the newer
one rather than queued. Never scale duration to the geographic distance, which would make a
fast train look slow.

**Route-aware motion.** Preferred where available. `calculated.routeProgress` publishes
`fractionAlong` against `shapeId`, and the alignment is already loaded, so the marker can be
sampled along the published polyline between two published fractions. This is **rendering, not
map matching** — the backend did the matching against the full geometry in MARC-502 and the
frontend only reads the scalar. Use `routeProgress.shapeId`, never `scheduled.shapeId`: they
are allowed to disagree and the fraction only means anything against the shape it was measured
on. Any `routeProgress.state` other than `MEASURED` falls back to the straight transition.

**Where each applies.** `calculated` is deliberately absent from the trains list, so route-aware
motion is available for the **focused** train only, and the system map uses the straight
transition between observed points. That fallback is explicitly acceptable. Do not fetch detail
per train to close the gap.

**Stale stops everything.** When a position goes stale, any in-flight transition stops
immediately and the marker takes the last-known treatment with its age. A gliding stale marker
is the worst failure this ticket can produce: it looks the most live while being the least
true.

**Stationary stays still.** `STATIONARY` with a fresh position does not animate. Fresh
observations keep arriving and keep being accepted; the marker simply does not move, and the
backend's own duration is shown.

**Unknown stays unknown.** A marker may transition between two official coordinates while
movement state is `UNKNOWN`. That the frontend animated something is not evidence of motion and
must never be rendered as MOVING.

**Reduced motion.** Under `prefers-reduced-motion` there is no transition at all: the marker is
placed directly at the new observation. Nothing is conveyed by the animation alone.

**Accessibility.** The selected train's semantic fields update regardless of the map. Announce
only meaningful status changes — fresh↔stale, movement state, next stop — never coordinate
updates.

## Acceptance Criteria

A newer observation transitions the existing marker and leaves every other marker untouched. No
marker ever occupies a position the backend did not publish, except transiently between two
published ones. A marker never continues past its newest observation. Stale stops animation and
switches treatment. `STATIONARY` never animates. `UNKNOWN` is never rendered as MOVING. Reduced
motion disables transitions entirely. Selection survives a position refresh. A train leaving
membership is removed cleanly, mid-transition included. No additional request is made for
animation, and no static geometry is refetched on the polling cadence.

## Tests Required

Run all established checks including `npm run e2e`, on deterministic fixtures. **No automated
test may depend on a live MTA feed.**

Cover: a new position updates the existing marker; an unchanged observation creates no duplicate
and starts no transition; an older observation does not move a marker backward; a stale train
stops animating; `STATIONARY` gets no synthetic movement; `UNKNOWN` stays `UNKNOWN` through a
coordinate change; a selected train stays selected across a refresh; a train leaving membership
is removed; reduced motion disables interpolation; polling does not refetch geometry; and a
transition interrupted by a newer observation ends at the newer one, never between.

Assert explicitly that **no rendered coordinate outlives its transition** — that once settled,
the marker's position equals the backend's published coordinate exactly.

## Manual Verification

Against the local backend with `cmd/ingest` looping, watch a real train receive consecutive
positions and confirm the marker transitions and then stops. Let a position go stale and confirm
animation ceases and the treatment changes. Confirm a hidden tab does not animate.

## Design Verification

Inspect rendered 360×800 and 1280×900 against [DESIGN.md](../DESIGN.md) and
[MAP_PLAN.md](../MAP_PLAN.md). Capture under `docs/reviews/WEB-MAP-7/`: the system map with
several active trains; one train receiving a newer position; the focused train; a stationary
train; a stale/last-known train; and reduced-motion behaviour where it can be captured.

**Label every synthetic fixture SYNTHETIC in the filename and the caption.** Synthetic movement
must never be described as an observed MARC train. Missing screenshots are an incomplete gate,
not a pass; tests alone cannot satisfy it.

## Definition of Done

Acceptance criteria and all required checks actually pass, with results recorded here. Review the
diff, update the ticket index, CURRENT_STATE.md, ARCHITECTURE.md, DESIGN.md and MAP_PLAN.md, and
preserve unrelated work. One completed-ticket commit with a WEB-MAP-7 subject. If the transition
cannot be made to stop reliably at the newest observation, record that as a blocker and leave
IN_PROGRESS rather than shipping a marker that keeps moving.
