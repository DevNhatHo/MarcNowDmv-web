# Visual and accessibility review

The standing record of how the four screens were reviewed, what was fixed, and what is not
claimed. Per-ticket evidence lives under `docs/reviews/<ticket>/`; this page is the summary
a future session should read first.

Last full pass: WEB-011, 2026-09-30, production build in installed Chrome at 360×800 and
1280×900 against the live local backend.

## The floor, enforced automatically

`npm run e2e` includes `tests/e2e/accessibility.spec.ts`, which runs on every screen at both
viewports and fails the suite on any regression:

| Check | Rule |
|---|---|
| axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) | zero violations |
| Standalone control height | at least 44 px |
| Horizontal page scroll | none at 360 px |
| Lists in `main` | every one has an accessible name |
| First-level headings | exactly one per page |
| Keyboard stops | every one shows a focus ring |
| Reduced motion | `--motion-duration` resolves to `0s` |
| Failed refresh | content retained and announced politely |

A control **inside a sentence** is exempt from the 44 px rule. That is WCAG 2.5.5's inline
exception, and forcing prose links to 44 px would wreck the line height of body text.

## Results of the WEB-011 pass

Across all eight screen-and-viewport combinations: **0 axe violations, 0 undersized
standalone controls, 0 unnamed lists, 0 px horizontal overflow, and exactly one `h1` per
page.**

## What the pass found and fixed

1. **Standalone links were below the target size.** The skip link (40 px), the brand
   (30 px), "See all MARC advisories" (22 px), "Read the operator's notice" (24 px) and
   "← Back to trains" (19 px) were all controls in their own right sitting under 44 px. A
   `.standalone-link` utility now gives them the full minimum height, while links inside
   prose keep their natural size.
2. **Form controls could focus without a ring.** `:focus-visible` alone left a gap for the
   date input, so `input`, `select` and `textarea` now also show the ring on plain `:focus`.
3. **Lists in `main` were unnamed.** The trains list, each advisory's "Applies to" list, the
   stop-times list and both diagnostics lists now carry accessible names, so a screen reader
   can tell them apart.
4. **A failed refresh changed silently.** The banner's text changed with nothing announced.
   A visually hidden polite live region now announces the *state* only — "Couldn't refresh…"
   or "…out of date" — and never the timestamp, which moves as the page ages. Announcing the
   banner itself would read every tick aloud, which the architecture rules out.

## What is not claimed

**This is not a certified accessibility audit.** It is an automated floor plus a rendered
review in **one browser**. No screen reader was driven, no other engine was tested, and no
user testing was done. Axe finds a minority of real barriers by design.

**One native gap is documented rather than fixed.** Tabbing through `<input type="date">`
moves across Chrome's internal sub-fields; each shows the focus ring, but one internal
picker part inside the shadow DOM does not, and page CSS cannot style it. Replacing the
native control with a custom one would trade a small native gap for a much larger custom
one, so the native input stays.

**Colour independence is checked by grayscale capture, not by a simulator.** Every status is
a distinct phrase as well as a tone, which is what makes the grayscale captures legible.

**Updated by WEB-015 on 2026-09-30.** MOVING, measured route progress, an identified next
stop and a stable delay trend have now been reviewed against **live** MARC service, at
evening service with two reporting trains. STATIONARY and any trip-level ON_TIME, DELAYED or
CANCELED remain unobserved — MDOT publishes no trip-level status at all — and still rest on
clearly labelled synthetic fixtures. See [the live record](reviews/WEB-015/README.md).

**Live data limits what could be reviewed.** The retained database reports no current status
for any train and no fresh movement, so the delayed, cancelled, moving and stationary
presentations were reviewed against clearly labelled synthetic fixtures rather than live
service. Those captures are named `*-synthetic-*` and are recorded as such in each ticket's
review.

## Per-ticket evidence

| Ticket | Record |
|---|---|
| WEB-001 | [reviews/WEB-001](reviews/WEB-001/README.md) |
| WEB-002 | [reviews/WEB-002](reviews/WEB-002/README.md) |
| WEB-004 | [reviews/WEB-004](reviews/WEB-004/README.md) |
| WEB-005 | [reviews/WEB-005](reviews/WEB-005/README.md) |
| WEB-007 | [reviews/WEB-007](reviews/WEB-007/README.md) |
| WEB-008 | [reviews/WEB-008](reviews/WEB-008/README.md) |
| WEB-009 | [reviews/WEB-009](reviews/WEB-009/README.md) |
| WEB-010 | [reviews/WEB-010](reviews/WEB-010/README.md) |
| WEB-011 | [reviews/WEB-011](reviews/WEB-011/README.md) |
| WEB-012 | [reviews/WEB-012](reviews/WEB-012/README.md) |
| WEB-013 | [reviews/WEB-013](reviews/WEB-013/README.md) |
| WEB-014 | [reviews/WEB-014](reviews/WEB-014/README.md) |
| WEB-015 | [reviews/WEB-015](reviews/WEB-015/README.md) |
| WEB-MAP-2 | [reviews/WEB-MAP-2](reviews/WEB-MAP-2/README.md) |
| WEB-MAP-6 | [reviews/WEB-MAP-6](reviews/WEB-MAP-6/README.md) |
| WEB-MAP-3 | [reviews/WEB-MAP-3](reviews/WEB-MAP-3/README.md) |
| WEB-MAP-4 | [reviews/WEB-MAP-4](reviews/WEB-MAP-4/README.md) |
| WEB-MAP-7 | [reviews/WEB-MAP-7](reviews/WEB-MAP-7/README.md) — contains clearly labelled **SYNTHETIC** frames |
| WEB-MAP-5 | [reviews/WEB-MAP-5](reviews/WEB-MAP-5/README.md) |
| WEB-UI-01 | [reviews/WEB-UI-01](reviews/WEB-UI-01/README.md) |
