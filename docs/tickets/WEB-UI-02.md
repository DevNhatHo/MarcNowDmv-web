# WEB-UI-02 — Alerts: progressive disclosure

Status: NOT_STARTED

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
