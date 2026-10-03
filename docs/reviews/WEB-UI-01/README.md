# WEB-UI-01 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend.
**Captured on Saturday 2026-10-03**, when MARC runs 18 trains against a weekday's 97, and at an
hour when **none of them was reporting a position**. Density judgements about the train list
and the map's markers therefore cannot be made from these images; they belong to WEB-UI-03 and
WEB-UI-05, which must capture on a weekday.

| File | Shows |
|---|---|
| `mobile-pulse.png`, `desktop-pulse.png` | The new palette, the quiet refresh line, and the navigation in both placements |
| `mobile-trains.png`, `desktop-trains.png` | Unchanged screens under the new tokens |
| `mobile-alerts.png`, `desktop-alerts.png` | Same, and the two distinct timestamps discussed below |
| `mobile-map.png`, `desktop-map.png` | The map with the bottom bar present |
| `*-map-grayscale.png`, `*-pulse-grayscale.png` | No state depending on colour |
| `*-refresh-current.png` | The routine state, deliberately quiet |
| `*-refresh-failed.png` | The failed state, deliberately not quiet |

## What was verified, with numbers

| | Mobile | Desktop |
|---|---|---|
| `nav[aria-label="Primary"]` landmarks | **1** | **1** |
| Refresh control target | **86 × 44** | **86 × 44** |
| Accent token | `#155eef` | `#155eef` |
| Canvas | `rgb(248, 250, 252)` | `rgb(248, 250, 252)` |
| Horizontal overflow | **0** | **0** |
| Independence notice clearance below the bar | **15 px** | n/a |
| Page errors / failed requests | none | none |

The navigation is `position: fixed` at the bottom on mobile and `position: static` in the header
on desktop — **one landmark moved by width, not two landmarks**, which a test now pins.

## A defect this review caught

At the end of every page on mobile, the fixed bar **covered the independence notice** — the
wording the design plan requires verbatim and visible. `main` had been given clearance but the
footer, which follows it, had none. The first fix left a 1 px overlap because the bar is 45 px
with its border, so the clearance now includes breathing room: measured 15 px on `/`, `/trains`
and `/map`.

The map's OpenStreetMap attribution was checked separately and is **not** covered: scrolled into
view it sits at 376–424 against a bar top of 755. An earlier automated reading suggested
otherwise, but that was measuring the attribution while it was below the fold.

## Reading these screenshots

**Full-page captures paint a `position: fixed` bar once, at its scroll position**, so in
`mobile-pulse.png` and the other full-page mobile images the navigation appears part-way down
the content. It does not do that in the browser; it sits at the bottom of the viewport. The
viewport-height captures (`*-map.png`, `*-refresh-*.png`) show it correctly.

## Judged and left alone

`/alerts` shows two timestamps: "Showing information received just now" and "Reported 1 min ago
by the operator". These are **different facts** — when this app last fetched, and when the
operator last published — and each says which it is. They were left as they are rather than
merged, because merging them would lose the operator's own reporting time.

## Checklist findings

Calm, yes — the routine refresh statement no longer has a border competing with the data.
Blue is now used intentionally: links, the accent, and the current destination, nothing else.
Density is unchanged by this ticket, which is correct; the screens it makes denser are
WEB-UI-02 and WEB-UI-03. Desktop remains a narrow column on a wide screen, which is
[WEB-UI-07](../../tickets/WEB-UI-07.md).

## Limits

No reference image was ever received for the stated visual north star, so these images are
judged against its **written** qualities. Visual equivalence to a mockup is not being claimed.
Greyscale is a colour-blindness proxy, not a substitute for assistive-technology testing.
Contrast figures were computed, not sampled from these renders.
