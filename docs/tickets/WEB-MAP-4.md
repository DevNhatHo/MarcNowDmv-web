# WEB-MAP-4 — Train focus and observation-based follow

Status: NOT_STARTED

## Goal

Make a selected train and the trustworthiness of its location immediately clear.

## Why

The map is required roadmap work and must preserve the existing commuter hierarchy and data-trust rules.

## Dependencies

[WEB-MAP-3](WEB-MAP-3.md).

## Scope

Add URL-backed selection, selected marker/shape emphasis, muted unrelated trains, shared selected-train summary, reported direction, next stop, backend progress/distance and opt-in follow. Preserve system camera and offer exit focus; manual pan pauses follow.

## Out of Scope

Separate train-detail business model, guessed direction/progress, continuous movement, geometry inference, detail-route embedding (WEB-MAP-5) and smooth transitions between observations ([WEB-MAP-7](WEB-MAP-7.md)).

## Expected Files

components/map/focus state and controls, app/map/page.tsx, shared detail presentation, focus browser tests.

## Implementation Notes

**Map surface:** MapLibre GL JS from [WEB-MAP-6](WEB-MAP-6.md). Focus emphasises the
selected train and its shape and de-emphasises the rest **within the existing layers**; do
not add overlay layers per selection.

Follow responds only to a **new fresh observation**. A stale position stops follow, and
manual pan pauses it. Nothing interpolates between observations in this ticket: a marker
moves when a new position arrives and not otherwise. [WEB-MAP-7](WEB-MAP-7.md) later adds a
transition between those two positions; it does not change when or why follow reacts.

**Do not fight the user's gestures** — see the [live movement addendum](../MAP_PLAN.md). A
manual pan or zoom pauses forced recentering immediately, and resuming is a visible,
deliberate control rather than a timeout that snatches the viewport back while someone is
reading it.

## Acceptance Criteria

Selection deep links and Back work; selected train/shape dominate; follow only responds to new fresh observations; stale data/manual pan stops recentering; exit restores system context; no duplicate status semantics.

## Tests Required

Run all checks; test selection switching, cancelled requests, invalid ID, missing position/shape, stale follow pause, user-pan pause, repeated/out-of-order observations, skipped stop and unknown progress.

## Manual Verification

Inspect focus on mobile/desktop, keyboard selection/exit, reduced motion, long identity and all missing/stale/error states. Verify no popup reopening is needed to read train status.

## Design Verification

Inspect rendered 360×800 mobile and 1280×900 desktop, actual data where available, loading/empty/error states, independent official/calculated labels and current versus last-known marker semantics. Use [DESIGN.md](../DESIGN.md) and [MAP_PLAN.md](../MAP_PLAN.md); capture screenshots when possible. Tests alone cannot satisfy this gate.

## Definition of Done

Acceptance criteria and required checks pass with recorded evidence. Update ticket/index/current state and relevant docs, review diff and preserve unrelated work. One completed-ticket commit with WEB-MAP-4 subject. Missing required backend contracts block implementation completion; record the blocker and leave incomplete rather than making a completion commit.
