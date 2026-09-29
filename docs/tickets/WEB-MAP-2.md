# WEB-MAP-2 — Canonical MARC route rendering

Status: NOT_STARTED

## Goal

Display the backend’s real MARC geometry on a restrained system map.

## Why

The map is required roadmap work and must preserve the existing commuter hierarchy and data-trust rules.

## Dependencies

[WEB-MAP-1](WEB-MAP-1.md). Also requires delivered BACKEND-UI-03; see [backend proposals](../BACKEND_GAPS.md).

## Scope

Add lazy browser-only Leaflet adapter and /map route/navigation; render canonical versioned shapes and matching stations with neutral background, limited controls, loading/error/empty states and text fallback. Cache geometry by immutable version/shape identity.

## Out of Scope

Train markers, approximate straight-line routes, frontend GTFS import, focus/follow and backend changes.

## Expected Files

app/map/page.tsx, components/map/*, lib/api/geometry.ts, verified wire types/proxy allowlist, map tests, docs/RUNBOOK.md.

## Implementation Notes

External gate: delivered BACKEND-UI-03 geometry contract and actual samples. Respect GeoJSON longitude/latitude order and exact trip-shape association; no active-catalog names on old-version geometry. Recheck payload bounds and attribution.

## Acceptance Criteria

Actual local canonical geometry renders without invented segments; version mismatch/error is explicit; no repeated geometry download per refresh; map can fail without hiding text navigation; no unused library on non-map screens.

## Tests Required

Run test/lint/typecheck/build and relevant browser tests. Test coordinate order, bounds, null/malformed geometry, version changes, cancellation, cleanup/remount and load failure.

## Manual Verification

Review mobile/desktop actual route geometry and station labels, zoom/pan/keyboard, long names, loading/error/empty; record screenshots where possible.

## Design Verification

Inspect rendered 360×800 mobile and 1280×900 desktop, actual data where available, loading/empty/error states, independent official/calculated labels and current versus last-known marker semantics. Use [DESIGN.md](../DESIGN.md) and [MAP_PLAN.md](../MAP_PLAN.md); capture screenshots when possible. Tests alone cannot satisfy this gate.

## Definition of Done

Acceptance criteria and required checks pass with recorded evidence. Update ticket/index/current state and relevant docs, review diff and preserve unrelated work. One completed-ticket commit with WEB-MAP-2 subject. Missing required backend contracts block implementation completion; record the blocker and leave incomplete rather than making a completion commit.
