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

External gate: delivered BACKEND-UI-02 active inclusion/retention contract. Nullable coordinates omit geographic marker, not train accessibility. Current versus stale marker uses shape/text distinction. STATIONARY label requires fresh position plus backend state; duration never ticks upward locally.

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
