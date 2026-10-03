# WEB-UI-04 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend on
**Saturday 2026-10-03**. **Real data**; no synthetic fixtures.

| File | Shows |
|---|---|
| `mobile-quick-look.png` | The sheet rising from the bottom on a phone |
| `desktop-quick-look.png` | The same dialog as a centred panel |
| `*-quick-look-grayscale.png` | Trust and provenance surviving with colour removed |
| `*-map-focus-same-component.png` | The map's focus panel, rendering the same component |

## The request rule, measured

| | Mobile | Desktop |
|---|---|---|
| Detail requests **before** opening a preview | **0** | **0** |
| Detail requests after opening one | **1** | **1** |

Nothing is prefetched for rows nobody opened. Closing unmounts the component, which stops the
read and its polling.

## One implementation, proven by comparison

The list's quick look and the map's focus panel are the same `TrainFacts` component. Captured
in the same pass, on two different trains:

```
quick look   WASHINGTON | Penn Line | Last known position · 4 hr ago |
             Official MTA · Realtime status unavailable · Reported heading 267° |
             This is where the train was last reported. It is not a claim about where it is now…

map focus    BALTIMORE  | Penn Line | Last known position · 1 hr ago |
             Official MTA · Realtime status unavailable · Reported heading 186° |
             This is where the train was last reported. It is not a claim about where it is now…
```

Identical structure and wording on both surfaces, which is the defect this ticket exists to
prevent.

## A drift this review caught

Before the fix, the quick look said **"Penn Line"** and the map's focus panel said **"PENN -
WASHINGTON"** — the same fact, two labels, on two screens a reader moves between. The map's
marker presentation now uses the same `lineLabel` as the list. Both say "Penn Line".

## The pattern, and why

A native `<dialog>` opened with `showModal()`, styled as a bottom sheet on a phone and a
centred panel on a wide screen. One pattern, both viewports.

Chosen over an anchored popover deliberately: the element gives focus trapping, Escape, a
backdrop and focus return for free, and a hand-rolled popover would have to reproduce all four.
**No component library was added** — the app still has no UI dependency.

Dismissal is URL-backed. Escape and a backdrop click both route through the same close link, so
the dialog and the URL cannot disagree about whether a preview is open; verified in this pass —
after Escape the search string is empty and no dialog remains. Back closes it too.

## What it claims

`mobile-quick-look.png` reads: `Last known position · 4 hr ago`, `Official MTA · Realtime status
unavailable`, then `MARC Now · observed movement — Movement unavailable`, `MARC Now · next stop
— Next stop unavailable`, `MARC Now · route progress — Progress unavailable`.

Every calculated value says *unavailable* rather than inventing one, each is labelled MARC Now
and never Official MTA, and the last-known position carries its own sentence saying it is
neither a current location nor a stopped train.

## Limits

Both captured trains have stale positions, because no MARC train was reporting a fresh position
at this hour on a Saturday. **A moving train, a stationary train and a fresh-position preview
were not captured from real data** — they are covered by deterministic tests, not by these
images. That capture belongs with the pending weekday verification already recorded for
WEB-UI-03.

Greyscale is a colour-blindness proxy, not assistive-technology testing. The axe pass and the
Escape behaviour are asserted by `tests/e2e/accessibility.spec.ts`, not by a screenshot.
