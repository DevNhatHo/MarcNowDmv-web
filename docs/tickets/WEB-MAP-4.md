# WEB-MAP-4 — Train focus and observation-based follow

Status: **DONE** (2026-10-02)

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

## Outcome

Selecting a train focuses it on the map: its marker and its own scheduled alignment are
emphasised, everything else is dimmed, and a panel states in text everything the emphasised
marker conveys. Selection lives in the URL, so a focused train is a shareable link and the
browser's Back button leaves focus.

### Checks actually executed

`npm run lint` clean, `npm run typecheck` clean, `npx vitest run` **248 tests in 16 files, 0
failures**, `npm run build` succeeded, `npx playwright test` **74 passed** across both required
viewports. Rendered review at 360×800 and 1280×900 in `docs/reviews/WEB-MAP-4/`, including
greyscale.

Verified live against `marc_208_live` with `cmd/ingest` polling: focusing a Penn Line train
reported `Current position · just now`, `Reported heading 202°`, `MARC Now · observed movement
— Moving`, `next stop UNION STATION MARC Washington`, and `0 m along a 64.4 km route · 0%`.

### Emphasis is data, not a new layer

Selection sets `selected` and `dimmed` properties on the existing shape and train features,
and the paint expressions read them. Focusing a train is therefore a `setData` call on two
sources: no layer is added, removed or restyled, and an e2e test asserts the canvas survives
selection. This is the discipline WEB-MAP-6 measured, carried into focus.

### Follow responds to evidence, and to nothing else

The decision is a pure function, `followTarget`, in the presentation layer rather than in the
renderer, because it is a judgement about evidence and not about drawing. It moves the camera
only when all four hold: the train is still on this view, it has a position, that position is
`CURRENT`, and the report is **strictly newer** than the one last followed.

Each refusal is tested. A last-known position never attracts the camera — chasing it would
point at where a train *was* as though that were live. A repeated response moves nothing. An
out-of-order older report cannot rewind the camera. And one test asserts the target is always a
published coordinate, never an extrapolation: this ticket interpolates nothing, which is
[WEB-MAP-7](WEB-MAP-7.md)'s.

Follow is **not offered at all** while the position is out of date, and the panel says why,
distinguishing stale tracking from a stopped train.

### The user's gestures win

A drag, zoom or rotate carrying a real `originalEvent` pauses forced recentring immediately;
`easeTo` fires the same events without one, so the camera never interrupts itself. Resuming is
an explicit choice, never a timer that snatches the viewport back. The camera is also moved
instantly rather than eased when `prefers-reduced-motion` is set.

### One detail request, bounded by the selection

Movement, next stop and route progress exist only on the detail endpoint. Focus reads it for
**that train alone**, from a component mounted only while something is selected, so exiting
focus stops the request and its polling. Tests assert exactly one detail call when focused and
**zero** when not. Nothing fans out per marker.

A failed detail read leaves identity, position trust and official status intact, because those
come from the list.

### Added to the shared presentation

`progressLabel`/`progressText` and a `RouteProgressStatus` component, keeping `AMBIGUOUS` and
`OFF_ROUTE` distinct from `UNKNOWN`: a position that matched the line in more than one place
and one that did not match it at all are different facts, and neither becomes a precise
progress.

### Accessibility

Two new e2e checks the plain `/map` pass could not see: axe plus the 44 px floor on the
**focused** state, and entering and leaving focus **from the keyboard alone**. The list is the
keyboard route into focus, so the canvas is never the only way to select a train, and the
focused train is marked in words as well as by emphasis.

### Limitation

Reduced motion is honoured by moving the camera instantly, which is asserted in the code path
but not in an automated test: Playwright can set `prefers-reduced-motion`, but the resulting
camera duration is internal to MapLibre and not observable from the page.

No blockers. Next: [WEB-MAP-7](WEB-MAP-7.md) — smooth transitions between observed positions.
