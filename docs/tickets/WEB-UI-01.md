# WEB-UI-01 — Visual foundation

Status: NOT_STARTED

## Goal

Re-tune the existing token system, compact the refresh treatment, and give mobile a bottom
navigation, so every later UI ticket builds on one calm foundation.

## Why

The token system is not the problem and is not being replaced: `app/globals.css` already
defines spacing, type, weight, radius, focus and target tokens, and every component already
uses them. This ticket changes their **values** and three shared components, which is why it
must land before the screen tickets.

Measured on the running app at 360×800: the refresh control is a bordered box with a button on
every screen, and `/alerts` carries a second freshness line beneath it saying the same thing a
different way.

## Dependencies

None. Every other WEB-UI ticket depends on this one.

## Scope

Token values, the `Freshness` component, `SiteNavigation`, and tabular numerals for times and
delays. No screen's information changes.

## Out of Scope

Screen layout (WEB-UI-02 through WEB-UI-06), any component library, dark mode, icons beyond
what the refresh control needs, and any change to what a screen says.

## The palette, already contrast-checked

Measured against `#FFFFFF` surface and `#F8FAFC` background; all pass WCAG AA for normal text:

| Token | Value | On surface | On background |
|---|---|---|---|
| brand | `#155EEF` | 5.41 | 5.17 |
| brand hover | `#0F4CCB` | 7.20 | 6.88 |
| text | `#0F172A` | 17.85 | 17.06 |
| text secondary | `#475569` | 7.58 | 7.24 |
| muted | `#64748B` | 4.76 | 4.55 |
| healthy | `#15803D` | 5.02 | 4.79 |
| warning | `#B45309` | 5.02 | 4.80 |
| critical | `#B42318` | 6.57 | 6.28 |

**Two things this table makes explicit.** The new palette is uniformly *lower* contrast than
the current one — brand falls from 7.85 to 5.41 — so it is a deliberate softening that still
clears AA, not an improvement in legibility. And `muted` at **4.55** on the background is the
tightest value in the set; anything that darkens that background later breaks it, so the
contrast check belongs in this ticket's evidence and must be re-run if the background changes.

Map the existing token names to the new values rather than renaming them, so no component
changes to adopt the palette. `--color-unknown` and `--color-text-muted` resolve to the **same**
`#64748B`, which is exactly why unknown and stale states must keep saying so in words.

## Border and surface

`#E2E8F0` on `#FFFFFF` is a contrast of **1.23**, and `#F8FAFC` against `#FFFFFF` is **1.05**.
Card edges will be very faint. That is an argument for the direction, not against it: where a
border is no longer visible enough to group anything, delete it and group with spacing.

## Refresh treatment

Replace the bordered banner with a quiet inline line:

```
Updated just now   ↻
```

Keep every behaviour it already has and do not reduce any of them: the polite `role="status"`
announcement fires only on a **state change**, not on each tick; a failed refresh keeps the
content on screen and reframes it as last received; an outdated cache says so. The visual
weight changes, the honesty does not.

Background polling must not replace content or show a spinner over data already on screen.

On `/alerts`, the separate "Reported N min ago by the operator" line and the refresh line say
overlapping things. Keep the operator's own reporting time — it is a different fact from when
this app last fetched — but make the distinction obvious instead of stacking two timestamps.

## Navigation

Desktop keeps the top navigation. Mobile gains a bottom navigation with the same four
destinations, in the same order, as the same `<nav aria-label="Primary">` landmark.

Preserve what the current navigation already does right: `aria-current="page"`, a current
marker that is weight and underline rather than colour alone, and the nested-route rule that
keeps Trains current on train detail. Targets stay at least 44 px. The skip link must still
reach `main`, and the bottom bar must not cover the last row of a scrolled list or sit over the
map's attribution, which is a licensing obligation.

## Typography

Tabular numerals for clock times and delay figures so columns align. Keep the existing scale;
this is not a type-scale rewrite.

## Acceptance Criteria

Every token resolves to the new value with no component edited to adopt it. Contrast is
measured and recorded, not assumed. The refresh control is visibly lighter and loses no
behaviour. Mobile shows a bottom navigation with the current destination announced, desktop is
unchanged, and neither covers content or attribution. No screen says anything new or different.

## Tests Required

All established checks. The existing axe and 44 px floors must pass on every screen at both
viewports, including train detail and the focused map. Add a test that the current destination
is announced rather than only styled, and that the refresh announcement still fires on state
change only. Re-run the contrast figures as part of the evidence.

## Manual Verification

Inspect every screen at 360×800 and 1280×900 before and after, confirming nothing moved that
this ticket did not intend to move.

## Design Verification

Capture into `docs/reviews/WEB-UI-01/` with a README: both viewports, the refresh line in
current, outdated and failed states, the mobile bottom navigation, and a greyscale pass
confirming no state now depends on colour. Apply the [DESIGN.md](../DESIGN.md) checklist.

## Definition of Done

Acceptance criteria and all required checks actually pass, with the contrast table recorded.
Update DESIGN.md, the ticket index and CURRENT_STATE.md. One completed-ticket commit with a
WEB-UI-01 subject.
