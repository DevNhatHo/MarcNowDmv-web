# WEB-UI-09 — one name per line, everywhere

Status: NOT_STARTED

## Goal

Finish removing the second spelling of a line name.

## Why

Release verification (`docs/reviews/RELEASE-VERIFY-001/`) found Pulse naming a line
"PENN - WASHINGTON" while the train list, the map markers and the quick look all said
"Penn Line" — two names for one line, visible together on the composed home screen. Pulse was
fixed in that session, with a test.

Two usages remain and were deliberately left rather than widened into a verification pass:

- the train list's line filter `<select>` option, and
- the map's "Lines" text-equivalent index.

Both name the *route* rather than a train's line, both use the operator's own published string,
and neither currently sits beside a conflicting spelling. That is why this is small and not
urgent.

## Dependencies

None. `lineLabel` already exists in `lib/presentation/trains.ts`.

## Scope

Those two call sites, and a test that asserts one spelling per screen.

## Out of Scope

**Advisory scope labels.** An alert's `informedEntity` names what the operator said the advisory
applies to, and rendering its published route name verbatim there is correct. Do not "fix" it.

Also out of scope: renaming anything the operator publishes, inventing a short name for a route
that does not split cleanly, and any change to `lineLabel` itself.

## Acceptance Criteria

No screen shows both spellings. The filter and the index read the same as the rows they filter
and index. An advisory's scope is unchanged. A route whose `longName` does not split cleanly
still shows its published name whole.

## Tests Required

All established checks. Assert a single spelling on the trains screen and on the map screen,
and that the alerts screen still shows the operator's published scope verbatim.

## Design Verification

Capture `/trains` and `/map` at both viewports into `docs/reviews/WEB-UI-09/` with a README.

## Definition of Done

Acceptance criteria and all required checks actually pass. Update the ticket index and
CURRENT_STATE.md. One completed-ticket commit with a WEB-UI-09 subject.
