# WEB-UI-02 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend on
**Saturday 2026-10-03**. Real operator advisories, no synthetic data.

| File | Shows |
|---|---|
| `mobile-alerts-collapsed.png`, `desktop-alerts-collapsed.png` | The default state: five advisories, each summarised |
| `mobile-alerts-expanded.png`, `desktop-alerts-expanded.png` | One opened to the operator's full notice |
| `mobile-alerts-grayscale.png`, `desktop-alerts-grayscale.png` | The degraded strip and the effect chips without colour |

## The measurement this ticket exists for

Measured the same way both times — the height of each `<li>` in the advisories list at 360×800:

| | Before | After |
|---|---|---|
| Per advisory | **1,051 px** | **246 px** (heights 264, 239, 264, 219, 244) |

**A 77% reduction.** The feed carried 11 advisories when the before figure was taken and 5 now,
so total page height is not comparable; per-advisory is.

Opening one advisory adds roughly 850 px on mobile — which is the point. That cost is now paid
by a reader who asked for it, instead of by every reader on arrival.

## What the design reference asked for, and what was done instead

The reference shows a short subject line ("Parking closure") above a station name ("Odenton
Station"). The real advisory's title is *"MARC Odenton Station update - Parking closure for
Phase 1 of garage construction"*, and producing the reference's two lines from it would mean
**parsing the operator's prose into fields the feed never published**.

So the title stays whole and wraps to three lines, and the scope line beneath it is built from
`informedEntity` — which is where the operator actually said what the advisory applies to. In
the capture it reads **"ODENTON MARC sb · ODENTON MARC nb"**, resolved from stop ids `11985` and
`11992` against the catalog. The second advisory's scope reads "PENN - WASHINGTON" from a route
selector. Neither came from a title.

This is the honest version of the reference's layout, and it is visibly close to it.

## Nothing was hidden

The full notice is in the document whether or not the disclosure is open — verified in the
review pass, not assumed. The collapsed preview is clamped by CSS rather than cut from the
string, and is `aria-hidden` so the notice is not announced twice; the disclosure body carries
the real text.

The operator's link lives in the body, never the summary, so no control nests inside another.

## The degraded strip

Now a rule and a marked line rather than a bordered card, and it still says the list may be
incomplete. It keeps the warning colour, gains a non-colour mark, and the greyscale capture
shows the wording carries it on its own.

## Checklist findings

Calm: yes, markedly. Density: high without crowding — each card carries title, effect, scope,
period and a preview in about 250 px. Cards: still one per advisory, which is a meaningful group
rather than a box around a value. Blue: only the "Read more" control and links.

Two advisories share an identical operator title and differ only by effect and scope; the suite
already has a test that they stay distinguishable, and the chips and scope lines do that here.

## Limits

Full-page mobile captures paint the `position: fixed` bottom navigation once at its scroll
position, so it appears part-way down the content. It does not do that in the browser.

Five advisories is what the feed carried today; a busier day will be longer. Greyscale is a
colour-blindness proxy, not assistive-technology testing. No judgement is made here about
whether a commuter finds the *right* advisory — relevance ranking is explicitly out of scope.
