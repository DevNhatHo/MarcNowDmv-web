# WEB-MAP-3 — Active train markers with position trust

Status: NOT_STARTED

## Goal

Show current trains and retained last-known locations without conflating them.

## Why

The map is required roadmap work and must preserve the existing commuter hierarchy and data-trust rules.

## Dependencies

[WEB-MAP-2](WEB-MAP-2.md). Also requires delivered BACKEND-UI-02 active membership; see [backend proposals](../BACKEND_GAPS.md).

## Scope

Render bounded backend-defined active train set and explicitly retained historical candidates; add marker labels and equivalent selectable text list with ID/line, official status, reported bearing and independent movement when available. Share WEB-010 polling and partial-coverage indicators.

## Out of Scope

Frontend active-window heuristics, per-marker detail requests, interpolation, inferred stationary state and focus UI.

## Expected Files

components/map/TrainMarkers*, shared presentation/resource code, verified map-summary client/types, marker tests.

## Implementation Notes

**Map surface:** MapLibre GL JS, delivered by [WEB-MAP-6](WEB-MAP-6.md), which must land
first. Trains are a graphics layer **updated in place**, never rebuilt each polling cycle,
and positions come from the single `/api/v1/trains` read the app already makes — never one
request per train or per marker.

**Membership:** the backend publishes `membership.scheduledActive`, `realtimeObserved` and
`positionFresh` as three separate facts (MARC-508). Do **not** collapse them into one
"active" flag in the client: the backend deliberately refused to, and live data shows them
disagreeing — a train with `positionFresh: true` and `scheduledActive: false` is running
late, not absent.

**Freshness is the hard rule.** A fresh position draws a current marker; a stale one draws a
last-known marker, distinguished by **shape and label, never colour alone**, with its age
("Last known position · updated 7 min ago"). A stale marker is never animated or moved, and
is never counted as a live train. `STATIONARY` with a fresh position reads "Appears
stationary · 6 min" using the backend's duration; with a stale position the screen says
"Position stale" and makes no movement claim. The frontend never infers one from the other.

**Stations**, owed by WEB-MAP-2's record, belong here: coordinates come from
`/api/v1/stops`, joined only on a matching schedule version.

**Identity:** `scheduled.headsign`, `scheduled.directionId` and `scheduled.shapeId`
(MARC-507) give a marker its label and its line without parsing the trip identifier. A train
with no position gets no geographic marker and must remain reachable in the text list.

## Acceptance Criteria

Fresh/stale/unknown/stationary are distinct; stale markers never count as live; missing coordinates remain accessible; requests bounded; hidden tabs pause; old responses cannot rewind positions. Missing system movement is honestly omitted, not fetched N times.

## Tests Required

Run all established checks; deterministic tests for mixed freshness, missing coordinates/bearing, stale stationary evidence, unknown enums, timestamp ordering, cache failure, membership expiry and pagination coverage. Assert zero continuous marker movement and no N+1.

## Manual Verification

Inspect actual local positions plus explicitly synthetic fresh/stationary/stale scenarios at mobile/desktop widths. Simulate backend loss and recovery; check overlapping marker access through list.

## Design Verification

Inspect rendered 360×800 mobile and 1280×900 desktop, actual data where available, loading/empty/error states, independent official/calculated labels and current versus last-known marker semantics. Use [DESIGN.md](../DESIGN.md) and [MAP_PLAN.md](../MAP_PLAN.md); capture screenshots when possible. Tests alone cannot satisfy this gate.

## Definition of Done

Acceptance criteria and required checks pass with recorded evidence. Update ticket/index/current state and relevant docs, review diff and preserve unrelated work. One completed-ticket commit with WEB-MAP-3 subject. Missing required backend contracts block implementation completion; record the blocker and leave incomplete rather than making a completion commit.
