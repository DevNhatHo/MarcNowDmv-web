# WEB-UI-02 — Alerts: progressive disclosure

Status: **DONE** (2026-10-03)

Sequencing note: this runs **before** the train and map tickets, against the suggested order,
because it is the measured largest win in the app and is contained to two components.

## Goal

Make an advisory scannable in a second, with the operator's full notice one deliberate action
away.

## Why

Measured on the running app at 360×800: `/alerts` is **5,823 px** tall for **11** advisories —
an average of **1,051 px each**. The cause is exact: the operator's `descriptionText` is
rendered inline in full, and on the Odenton advisory that single field is **1,059 characters**
against an 80-character `headerText`.

Collapsing one field therefore removes roughly 1,000 characters per advisory. No other change
in this milestone is worth as much per line of code.

## Dependencies

[WEB-UI-01](WEB-UI-01.md).

## Scope

`AlertCard`, `AlertsScreen` and the degraded-source treatment. No change to what is published,
to the alert contract, or to how an alert relates to a train.

## Out of Scope

Filtering or sorting advisories, grouping by line or station, any relevance ranking, any claim
that an advisory affects a particular train, and any change to the alerts data path.

## The collapsed card

Visible by default: the operator's title, its effect, its published scope, and its active
period. Collapsed behind a disclosure: the full `descriptionText` and the operator link.

**Scope comes from `informedEntity`, never from the title.** The Odenton advisory's title reads
"MARC Odenton Station update - Parking closure for Phase 1 of garage construction", and its
`informedEntity` carries `stopId` `11985` and `11992`. Resolve those against the stop catalog
on the matching schedule version. Do **not** parse the title to extract a station or a subject:
splitting an operator's prose into fields is inventing structure the feed did not publish, and
it is the same error as reading a train number out of a trip identifier.

A title stays the operator's title, whole and verbatim, however long it is. If it wraps to four
lines, it wraps.

## Progressive disclosure, not hiding

The disclosure is closed by default and its summary must say what is behind it, including that
it is the operator's own wording. Use the native `<details>` the app already uses elsewhere, so
keyboard and screen-reader behaviour comes for free and no component library is needed.

Nothing that changes what a commuter should *do* may be collapsed. If the visible summary
cannot carry the effect and the scope, show more, not less.

## The degraded strip

The degraded-source warning is currently a full bordered card. Make it a compact strip that
still says the advisories may be incomplete and still offers the detail. **Its meaning is
unchanged**: a degraded alert feed is a real limitation, and compacting it must not make it
look optional or decorative. It stays distinguishable without colour.

## Acceptance Criteria

An advisory's visible height is a small fraction of its current one, with the full notice
reachable in one action. Scope is resolved from `informedEntity`, and no title is parsed.
Effect, cause and active period keep their current meanings and wording. The degraded warning is
still unmissable. Nothing a commuter must act on is behind the disclosure. The screen still
works with the disclosure never opened.

## Tests Required

All established checks. Deterministic tests for: a very long operator notice; an advisory with
no description; one with no `informedEntity` at all; one whose `stopId` is not in the catalog;
one whose selectors span several stops and routes; an advisory from a superseded schedule
version, which must not borrow a current station name; the degraded feed state; and the empty
state. Assert the full notice is present in the document when collapsed, so it is disclosed
rather than withheld.

Record the measured page height before and after.

## Manual Verification

Against the local backend, read the real advisory set at both viewports and confirm the longest
real notice is still fully readable once opened.

## Design Verification

Capture into `docs/reviews/WEB-UI-02/` with a README: both viewports, collapsed and expanded,
the degraded strip, the empty state, a long-title advisory, and greyscale. Record the measured
height change. Apply the [DESIGN.md](../DESIGN.md) checklist.

## Definition of Done

Acceptance criteria and all required checks actually pass, with the before/after heights
recorded. Update the ticket index and CURRENT_STATE.md. One completed-ticket commit with a
WEB-UI-02 subject.

## Outcome

An advisory is now a summary with the operator's full notice one action away.

### The measurement

Per-advisory height at 360×800, measured the same way before and after:
**1,051 px → 246 px, a 77% reduction.** The feed carried 11 advisories then and 5 now, so
only the per-advisory figure is comparable. Opening one adds about 850 px — paid by the reader
who asked for it rather than by everyone on arrival.

### Checks actually executed

`npm run lint` clean, `npm run typecheck` clean, `npx vitest run` **294 tests in 19 files, 0
failures**, `npm run build` succeeded, `npx playwright test` **80 passed, 4 skipped, 0 failed**.
Rendered review in `docs/reviews/WEB-UI-02/`.

### The title was not split, and the reference was still met

The [reference](../design-reference/screens-desktop-and-mobile.png) shows "Parking closure" over
"Odenton Station". The real title is *"MARC Odenton Station update - Parking closure for Phase 1
of garage construction"*, and producing those two lines from it means parsing operator prose
into fields the feed never published.

The title therefore stays whole, and the scope line comes from `informedEntity`: in the capture
**"ODENTON MARC sb · ODENTON MARC nb"**, resolved from stop ids `11985` and `11992`. A route
selector renders as "PENN - WASHINGTON". The result looks close to the reference and claims
nothing the operator did not publish.

`scopeSummary` collapses duplicate selectors and counts the remainder past two, so an advisory
naming eleven stops cannot push its own title off the screen; the full list stays in the body.

### Nothing was hidden

The full notice is in the document in both states — asserted by a test, and re-verified in the
review pass. The preview is clamped by CSS rather than cut from the string, and is `aria-hidden`
so the notice is not announced twice. The operator's link lives in the body, never the summary,
so no control nests inside another.

Effect is a quiet outlined chip rather than a filled severity colour: this feed's effects are
mostly "Other effect", and colouring them would imply a severity ranking the operator never
published.

### Three existing tests failed, all correctly

They asserted the old structure: the degraded wording changed, the notice now appears twice in
the DOM, and the "no description" caveat is inside a collapsed disclosure. Each was updated to
the new structure rather than loosened — the markup test now asserts **every** occurrence is
escaped, which is stronger than the original.

No blockers. Next: [WEB-UI-03](WEB-UI-03.md) — compact train rows and an honest Now.
**It must be captured on a weekday**; today is a Saturday with 18 trains against a weekday's 97.
