# WEB-MAP-5 — Map and train-detail integration

Status: **DONE** (2026-10-02)

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

**Map surface:** MapLibre GL JS from [WEB-MAP-6](WEB-MAP-6.md).

The accessibility requirement is the point of this ticket, not a footnote: no train
information may be available **only** on the map. Identity, status, position age, next stop
and movement state must appear in ordinary semantic markup beside it, and the existing list
and detail screens must stay complete without the map.

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

## Outcome

The journey is one piece. System map → focus → full detail → back to the focused map, and
list → detail → system map, both keeping the filters the reader chose.

### Checks actually executed

`npm run lint` clean, `npm run typecheck` clean, `npx vitest run` **277 tests in 18 files, 0
failures**, `npm run build` succeeded, `npx playwright test` **84 passed** across both required
viewports. Rendered review in `docs/reviews/WEB-MAP-5/`, including greyscale.

### The map on detail is additive, which is the point

Train detail now embeds the same renderer, presentation and markers the system map uses —
not a second map. It draws this train on its own scheduled alignment, with its stations.

Everything it shows is already stated in text above it: identity, status, position trust, the
age of the report, next stop and movement. An e2e test **blocks the geometry request** and
asserts the screen stays complete, and a unit test covers the same path. That is the
accessibility requirement this ticket exists for, verified rather than asserted.

Geometry is read on the **catalog** cadence and keyed by shape, so it is shared with the system
map's read rather than fetched per train, and never refetched on the position cadence. A test
pins one shapes request per detail view.

### Return context

`from=map` marks where a reader came from. Arriving from the map, "← Back to map" returns to
the focused map with the line filter intact; arriving from the list, "← Back to trains" returns
with its filters. The marker is stripped from the destination rather than carried into it, and
the list's service date is dropped when returning to the map, which has no such filter. Detail
also offers "See this train on the system map", using the backend's own train identity rather
than the URL token it was reached by.

### What the existing suite caught

The embedded map's attribution control is a `<details>`, which made
`page.locator("details")` ambiguous on detail and failed an **existing** integration test. That
test was right to fail; it now names the diagnostics disclosure by its content instead of its
tag. Nothing about the product changed.

### Review records written for the whole map milestone

`docs/reviews/WEB-MAP-3/`, `-4`, `-5`, `-6` and `-7` had screenshots but no READMEs, and
`docs/visual-review.md` did not index them — a gap in my own earlier tickets. Each now records
what the evidence shows, what data it came from and what it cannot prove. WEB-MAP-7's states
plainly which frames are **SYNTHETIC** and that the movement in them did not happen.

### An honest note on the suite

One full `npx playwright test` run failed on `a marker never drifts past its newest
observation`: the canvas did not appear within 60 s. It passed alone and the next full run
passed **84/84** clean. The cause is contention — detail specs now load maps too, so more
browser contexts compete for the backend's four-connection pool and for tiles. It is recorded
as an observed flake rather than written off.

### Remaining gaps

- **[BACKEND-UI-06](../BACKEND_GAPS.md)** — route progress on the trains list, which would let
  the **system** map transition along the alignment as the focused train already does. The
  straight transition is the accepted fallback and nothing is computed in the browser.
- **BACKEND-UI-02's movement summary** — until it exists the system map omits movement rather
  than approximating it.
- Reduced-motion camera duration is not automatically asserted; it is internal to MapLibre.
- A last-known ring and a station dot are both hollow circles, distinguishable by size, stroke
  and label but the weakest distinction on the map. Distinct shapes would need a sprite.

The map milestone is complete: WEB-MAP-1 through WEB-MAP-7 are all DONE.
