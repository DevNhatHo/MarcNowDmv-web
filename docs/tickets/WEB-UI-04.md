# WEB-UI-04 — Train Quick Look

Status: NOT_STARTED

## Goal

Let a commuter see what a train is actually doing without leaving the list or the map.

## Why

Movement, next stop and route progress live only on the detail endpoint. Today the only way to
reach them is to navigate to the detail page and come back, which is a lot of travel to answer
"is it moving".

## Dependencies

[WEB-UI-03](WEB-UI-03.md) for the row it opens from. Reuses the focus work from
[WEB-MAP-4](WEB-MAP-4.md).

## Scope

One preview component, opened from a train row and from a map marker's selection, showing the
same facts in both places.

## Out of Scope

A second status model, any change to detail, any change to map focus behaviour, prefetching,
and any new backend contract.

## The request rule, which is the whole risk

`calculated` is **not** on the trains list. A preview therefore needs a detail read, and that
is only acceptable because it is **bounded by one deliberate user action**:

- One request, for the one train whose preview was opened.
- **Never** prefetched for rows that were not opened, never on hover-intent across a list, and
  never for every marker on the map.
- Closing the preview stops the read and its polling, exactly as exiting focus already does.

WEB-MAP-4 established this pattern: the focus panel's read is mounted only while a selection
exists. Quick Look is the same shape, and must reuse it rather than growing a second one. A
test must assert that opening *n* previews in sequence issues *n* requests and that opening
none issues zero.

## One set of semantics, used twice

The map's focus panel and the list's Quick Look show the same facts and must share the same
components and the same wording. Movement, next stop and progress already exist as
`MovementStatus`, `NextStopStatus` and `RouteProgressStatus`, and position trust already exists
in the markers presentation. **Do not write a second implementation of any of them.** Two
places that describe a train differently is the defect this ticket exists to prevent.

Keep every distinction those components already make: calculated values are labelled MARC Now
and never official MTA; `UNKNOWN` movement is not stationary; a stale position is not a stopped
train; a per-stop delay is named with its stop and never becomes a trip delay.

## Shape

Desktop a popover, mobile a bottom sheet. Both must be dismissible by Escape and by pointer,
return focus to the control that opened them, trap focus while open, and be announced. Nothing
in the preview may be reachable only by hover: hover may *open* it on desktop, but focus and
activation must do the same.

The preview is a convenience, never the only route to anything. "View train details" stays.

## Component primitives

The app currently has **no UI dependency** and uses native `<details>`, `<select>` and links.
Prefer native `<dialog>` with the app's existing focus conventions.

If a primitive genuinely cannot be built accessibly in reasonable time, a minimal Radix or Base
UI primitive may be added — but only the one primitive, and the ticket must record the
**measured** bundle cost the way WEB-MAP-6 recorded MapLibre's 275 kB. Do not adopt a design
system for styling. Icons are not required by this ticket.

## Acceptance Criteria

A preview opens from a list row and from a selected map train, showing identical facts in both.
Exactly one detail request per opened train and none for unopened ones. Keyboard open, dismiss
and focus return all work. Nothing is hover-only. The list and map remain fully usable if the
preview never opens, and a failed detail read leaves the row's own facts intact.

## Tests Required

All established checks. Deterministic tests for: request count on open, close and reopen;
zero requests when nothing is opened; a failed detail read; a train with no position; `UNKNOWN`
movement; a stale position showing last-known wording; `STATIONARY` with a fresh position;
keyboard open and Escape close with focus returned; and that the preview and the map's focus
panel render the same wording from the same component.

## Manual Verification

Against the local backend, open previews from both the list and the map, by pointer and by
keyboard, at both viewports, and confirm the two surfaces agree.

## Design Verification

Capture into `docs/reviews/WEB-UI-04/` with a README: desktop popover and mobile sheet, a
moving train, a stationary train, a stale train, an unknown-movement train, a failed read, and
greyscale. Label any synthetic state **SYNTHETIC**. Apply the [DESIGN.md](../DESIGN.md)
checklist.

## Definition of Done

Acceptance criteria and all required checks actually pass, with request counts recorded and any
added dependency's bundle cost measured. Update the ticket index and CURRENT_STATE.md. One
completed-ticket commit with a WEB-UI-04 subject.
