# WEB-UI-07 — Desktop glanceable composition

Status: NOT_STARTED

Sequencing note: this runs **after [WEB-UI-05](WEB-UI-05.md) and before
[WEB-UI-06](WEB-UI-06.md)**, so the review ticket judges the finished desktop rather than
signing off a layout that then changes.

## Goal

Use desktop width for a single glanceable commute view, without duplicating a line of logic.

## Why

The app is mobile-first and reads as a narrow column on a wide screen. The
[visual north star](../DESIGN.md) suggests a composition the current layout does not attempt:
status on the left, the map dominant in the centre, and useful commute context on the right.

## Dependencies

[WEB-UI-05](WEB-UI-05.md) for the map layout, [WEB-UI-03](WEB-UI-03.md) for compact rows, and
[WEB-UI-02](WEB-UI-02.md) for compact advisories. This ticket composes them and builds nothing
new.

## Scope

A desktop-width composition on the home/Pulse route, assembled from components the existing
screens already own.

## Out of Scope

**Removing or demoting any of the four routes.** Pulse, Trains, Map and Alerts stay dedicated,
linkable and complete on their own — this is an additional composition, not a replacement for
them. Also out of scope: any new data, any new request, a second status model, and any layout
below desktop width.

## The rule that makes this safe

**No business logic is duplicated.** Every panel renders an existing component fed by the
existing shared resource store, keyed as those screens already key it, so the map's geometry
read and the trains read are *shared* rather than repeated. If a panel needs something no
component already provides, that is a signal to stop and reconsider, not to write a second
implementation.

A test must assert the composed view issues **no more requests** than the screens it composes,
and that no request is made per row or per marker.

## Composition

At desktop width only: service status left, map centre and dominant, current trains right.
Below that width the route keeps its current single-column form unchanged — this is a
progressive enhancement of a wide viewport, not a new mobile design.

Density is the risk. A three-panel desktop layout fails if each panel becomes a near-empty box
with a large heading. Each panel must carry real, current information at a density close to the
screen it came from.

## What it must not claim

The composed view inherits every semantic its parts already carry and may not soften any of
them. Scheduled counts are not running counts. A last-known position is not current. Advisory
scope is not a claim about a train. Calculated values stay labelled MARC Now and distinct from
official MTA. If a panel cannot fit a caveat, it shows less data — not the same data with the
caveat removed.

## Acceptance Criteria

At desktop width the route presents one glanceable composition with the map dominant; below it
the route is unchanged. All four dedicated routes remain reachable and complete. No logic is
duplicated and no additional request is issued. Every panel keeps the wording and distinctions
of the screen it came from. Keyboard order is sensible across panels and the landmark structure
stays valid with exactly one `h1`.

## Tests Required

All established checks. Tests for: request count versus the sum of the composed screens;
landmark and heading structure; keyboard traversal across panels; the narrow-width layout being
unchanged; and that a stale or unknown value in a panel reads exactly as it does on its own
screen.

## Manual Verification

Against the local backend with `cmd/ingest` polling, inspect at 1280×900 and at a wider width,
plus the width immediately below the composition's breakpoint.

## Design Verification

Capture into `docs/reviews/WEB-UI-07/` with a README: desktop composition, the breakpoint
boundary either side, a degraded state, a stale selected train, and greyscale. Judge against the
north star's written qualities, and state that the reference image was never received so visual
equivalence is not being claimed. Apply the [DESIGN.md](../DESIGN.md) checklist.

## Definition of Done

Acceptance criteria and all required checks actually pass, with the request-count comparison
recorded. Update the ticket index and CURRENT_STATE.md. One completed-ticket commit with a
WEB-UI-07 subject.
