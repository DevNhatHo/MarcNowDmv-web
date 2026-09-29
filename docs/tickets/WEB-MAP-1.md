# WEB-MAP-1 — Map technology and data contract

Status: NOT_STARTED

## Goal

Confirm Leaflet/provider choice and turn map data needs into a verified integration contract.

## Why

The map is required roadmap work and must preserve the existing commuter hierarchy and data-trust rules.

## Dependencies

[WEB-012](WEB-012.md).

## Scope

Review MAP_PLAN.md against actual backend responses and installed Next stack. Record stable library/version/license, neutral-background orientation feasibility, mobile cost and accessibility tradeoffs. Verify geometry, active membership, positions, selected detail, bearing and freshness contracts; update backend proposals and blockers.

## Out of Scope

Production map screens, frontend GTFS parsing, new backend endpoints, paid subscriptions and AWS.

## Expected Files

docs/MAP_PLAN.md, docs/API_CONTRACT.md, docs/BACKEND_GAPS.md, docs/contract-samples/ (actual new responses only), docs/RUNBOOK.md.

## Implementation Notes

Do not invent endpoint paths or label proposed payloads actual. Leaflet is recommended; a different choice requires concrete findings. Geometry and active-set delivery remain external gates; documentation of missing APIs can satisfy this assessment ticket.

## Acceptance Criteria

Library/provider decision and actual contract evidence are recorded; every required field has source/fallback; backend gates are explicit; no map rendering ticket is cleared on synthetic data alone.

## Tests Required

Validate sample JSON, links and contract discrepancies. Run established frontend checks if any executable spike is retained; otherwise state documentation-only checks. A temporary orientation experiment must not be confused with delivered product UI.

## Manual Verification

Inspect actual geometry endpoint if delivered, otherwise record absence; review mobile orientation approach and accessible text alternative. No production rendered map pass is claimed in this assessment.

## Design Verification

Document the design/provider review and any temporary experiment honestly; no production UI is delivered by this assessment.

## Definition of Done

Acceptance criteria and required checks pass with recorded evidence. Update ticket/index/current state and relevant docs, review diff and preserve unrelated work. One completed-ticket commit with WEB-MAP-1 subject. Missing required backend contracts block implementation completion; record the blocker and leave incomplete rather than making a completion commit.
