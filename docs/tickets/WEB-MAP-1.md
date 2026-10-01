# WEB-MAP-1 — Map technology and data contract

Status: DONE (2026-09-30)

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

## Outcome

An assessment ticket, completed as documentation. **No map code, dependency or screen was
added**, and no map rendering ticket is cleared by it.

**Leaflet 1.9.4, BSD-2-Clause** confirmed from the npm registry and retained as the
recommendation, with no external basemap: MARC geometry on a neutral background needs no
tile service, no API key, no per-view cost and no third-party request from a commuter's
browser. It is deliberately **not installed**; that belongs to the first ticket that renders
something.

Every map data need was checked against the running backend rather than inferred, and each
has a source or an explicit fallback. The table is in [MAP_PLAN.md](../MAP_PLAN.md).

Two findings came out of reading the backend's actual route table:

1. **`/api/v1/departures` exists and was missing from our contract document.** The WEB-003
   review worked from planning captures that never requested it. It is SCHEDULED, requires
   `stopId` and `serviceDate`, and uses **`YYYY-MM-DD`** where every other endpoint uses
   `YYYYMMDD` — `?serviceDate=20260930` returns 400.
2. **It exposes a scheduled `headsign`**, "UNION STATION" in the captured response. That
   corrects BACKEND-UI-01: the claim that no destination exists anywhere in the contract was
   wrong. It is stop-scoped and absent from list and detail, so those screens still fall back
   to the verbatim `tripId`, and the remaining gap is a display name on those responses.

BACKEND-UI-02 and BACKEND-UI-03 were verified **undelivered** by probe: `/api/v1/shapes`,
`/api/v1/geometry`, `/api/v1/routes/geometry` and `/api/v1/trains/active` all return 404, and
the backend's route table contains no other path. BACKEND-UI-04 was confirmed live by
WEB-012.

Three real captures were added to `docs/contract-samples/`, with the manifest extended to
record when and against what they were taken.

Checks: documentation only, plus JSON validity of the new captures and a repository-wide
link check. No executable spike was retained, so no frontend check applies. The backend was
not modified.

## Deliberately not done

**No orientation spike.** A temporary Leaflet experiment would have rendered invented
coordinates, and the one thing this ticket must not produce is a picture that looks like
MARC geometry but is not. The feasibility question is answered by Leaflet's documented
GeoJSON support without inventing data.

## Blockers

**WEB-MAP-2 and WEB-MAP-3 cannot be started.** Their dependencies are *delivered* backend
contracts — BACKEND-UI-03 geometry and BACKEND-UI-02 active membership — and neither exists.
WEB-MAP-4 and WEB-MAP-5 chain off them. This repository owns presentation only and must not
modify the backend, so unblocking them is separately authorized backend work.
