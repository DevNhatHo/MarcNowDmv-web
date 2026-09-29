# WEB-MAP-5 — Map and train-detail integration

Status: NOT_STARTED

## Goal

Complete one consistent journey from system map or train list into focused detail.

## Why

The map is required roadmap work and must preserve the existing commuter hierarchy and data-trust rules.

## Dependencies

[WEB-MAP-4](WEB-MAP-4.md).

## Scope

Embed shared focused map in existing detail when requested; wire map/list/detail navigation, filters/return context and Map navigation; share components/subscriptions. Extend original integration smoke and visual review to cover the full map experience.

## Out of Scope

New detail model, additional data inference, AWS, paid maps and unrelated features.

## Expected Files

app/trains/[id]/page.tsx, app/map/page.tsx, shared map/detail components, tests/e2e/*, docs/visual-review.md, docs/RUNBOOK.md, docs/CURRENT_STATE.md.

## Implementation Notes

One identity/provenance/resource model serves both routes. Preserve working text detail when map library or geometry fails. No duplicate pollers or extra detail fetch per marker. Use actual backend data where available; label synthetic fresh scenarios.

## Acceptance Criteria

List→detail→focused map and system→selected train→detail→system work with filters/Back; responsive status panel stays legible; no stale marker looks live; all map gates and visual reviews pass; remaining gaps documented.

## Tests Required

Execute all established test/lint/typecheck/build/e2e checks and actual local map/geometry/position/detail smoke; test library failure fallback, navigation and request ownership. Do not label skipped live contract checks passed.

## Manual Verification

Complete mobile/desktop screenshots and keyboard/zoom/reduced-motion review, current/stale/unknown/stationary/error/empty scenarios, plus system/focus transitions. Apply full DESIGN.md checklist.

## Design Verification

Inspect rendered 360×800 mobile and 1280×900 desktop, actual data where available, loading/empty/error states, independent official/calculated labels and current versus last-known marker semantics. Use [DESIGN.md](../DESIGN.md) and [MAP_PLAN.md](../MAP_PLAN.md); capture screenshots when possible. Tests alone cannot satisfy this gate.

## Definition of Done

Acceptance criteria and required checks pass with recorded evidence. Update ticket/index/current state and relevant docs, review diff and preserve unrelated work. One completed-ticket commit with WEB-MAP-5 subject. Missing required backend contracts block implementation completion; record the blocker and leave incomplete rather than making a completion commit.
