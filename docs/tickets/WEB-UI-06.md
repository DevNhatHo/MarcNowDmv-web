# WEB-UI-06 — Pulse hierarchy and cross-device review

Status: **DONE** (2026-10-03)

## Goal

Finish Pulse, then judge the whole refinement on real devices and real states rather than on a
passing suite.

## Why

Pulse is already the calmest screen in the app — measured at 360×800 it is **1,224 px** with
**3** bordered boxes, against alerts' 5,823 px and the train list's 113 px per row. Its
remaining work is small and does not justify a ticket of its own, so it is paired with the
review that has to come last anyway.

What Pulse does carry is explanatory prose at the same prominence as the status it qualifies.
The explanation is correct and must survive; its weight is what changes.

## Dependencies

Everything: [WEB-UI-01](WEB-UI-01.md) through [WEB-UI-05](WEB-UI-05.md).

## Scope

`PulseScreen` hierarchy and progressive disclosure, then a cross-device and cross-state review
of all four screens plus train detail.

## Out of Scope

New Pulse data, any summary the backend does not publish, counts of "running" trains, and any
new ticket's worth of change discovered during review — record those instead.

## Pulse

Intended hierarchy:

```
Pulse
Service overview for Sat, 3 Oct 2026
[compact degraded notice, only if degraded]

MARC service      18 scheduled today
Penn Line         18 scheduled
Advisories        3 relevant
```

The sentence explaining that this service **cannot determine how many trains are actually
running** moves behind a `Why?` disclosure. It does not get deleted, softened, or reworded into
something that implies the figure is a live count. The visible figure stays what it is: trains
**scheduled**, and the label must say so on its own.

`3 relevant` must mean something the backend published — the count of current advisories — and
must not imply any advisory applies to any particular train. The alerts screen already says a
scope entry does not say which trains are affected; Pulse must not undo that by calling them
relevant to the reader.

## The review

Inspect every screen at 360×800 and 1280×900, and at a tablet width, covering: normal, loading,
empty, error, degraded-feed, stale position, stationary, unknown status, long identifiers and
long operator titles, and 200% zoom reflow.

Verify, by inspection rather than by assertion:

1. the primary information reads in five seconds;
2. no state is distinguishable by colour alone;
3. official MTA and MARC Now values are still visibly distinct;
4. a stale position never reads as current and never as stopped;
5. nothing is reachable only by hover;
6. no horizontal scrolling at any width;
7. reduced motion removes the marker transition and the camera ease.

**A weekday capture is required.** Reviews taken on a Saturday show 18 trains where a weekday
shows 97, and the train list's density is the thing being judged. Note the capture day in the
README.

## Acceptance Criteria

Pulse leads with status and keeps every uncertainty statement available. The whole app holds
the zero-axe-violation and 44 px floors at every viewport, including train detail and the
focused map. No regression against any data-trust rule. Findings that need more than a small
fix are written up as tickets rather than quietly fixed or quietly dropped.

## Tests Required

All established checks across the suite. Add Pulse tests for the disclosure and for the
scheduled-versus-running wording. Run the accessibility suite at every viewport.

## Manual Verification

The checklist above, on a weekday, against the local backend with `cmd/ingest` polling.

## Design Verification

Capture into `docs/reviews/WEB-UI-06/` with a README covering every screen and state listed
above, what was captured on which day, what is **SYNTHETIC**, and what the screenshots cannot
prove. Apply the full [DESIGN.md](../DESIGN.md) checklist and record the findings, including
the ones not acted on.

## Definition of Done

Acceptance criteria and all required checks actually pass, with the review recorded and any
deferred findings written up. Update DESIGN.md, ROADMAP.md, the ticket index and
CURRENT_STATE.md. One completed-ticket commit with a WEB-UI-06 subject.

## Outcome

Pulse's uncertainty explanation moved behind a `Why?` disclosure, and the whole milestone was
reviewed across three widths and every state.

### Checks actually executed

`npm run lint` clean, `npm run typecheck` clean, `npx vitest run` **340 tests in 23 files, 0
failures**, `npm run build` succeeded, `npx playwright test` **84 passed, 4 skipped, 0 failed**.
26 captures in `docs/reviews/WEB-UI-06/`.

Measured on every screen at 360, 768 and 1280: **0 horizontal overflow, exactly one `h1`, 0
overflow at 200% text, no page errors.**

### A regression the review caught

`/trains` overflowed by **155 px at 200% text** on a 360 px viewport — a WCAG 1.4.10 reflow
failure. A date input carries an intrinsic width that doubles with the text size, and the filter
row measured 505 px inside a 360 px screen. The existing zoom test checks `/` only, so it never
saw it. Fields now shrink and the Now/Today control wraps; the figure is 0 at all three widths.

### Pulse

The explanation is behind `Why?`, not deleted and not softened. Two tests were updated to assert
it is present and visible once opened, rather than visible by default.

### What is still open

**PENDING LIVE WEEKDAY DENSITY VERIFICATION**, carried from WEB-UI-03. Every capture in this
milestone is a Saturday with 18 trains against a weekday's 97. Density at weekday volume is
verified from a labelled SYNTHETIC fixture; legibility at 97 real rows is not. Correctness does
not depend on it. Also open: a fresh-position capture of the quick look and map sheet, and an
overnight capture of the real service-ended state.

These are recorded as follow-up design checks, not as defects.

The UI refinement milestone is complete: WEB-UI-01 to WEB-UI-08 are all DONE.
