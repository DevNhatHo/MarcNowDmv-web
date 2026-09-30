# WEB-010 rendered review

Production build served by `npm start`, driven in installed Chrome at 360×800 and 1280×900
against the live local backend.

## Screenshots

| File | What it shows |
|---|---|
| `mobile-current.png`, `desktop-current.png` | a freshly received list, banner reading "Received just now." |
| `mobile-refresh-failed.png`, `desktop-refresh-failed.png` | a refresh failed against an aborted backend |

## Observed behaviour

| Measurement | Mobile | Desktop |
|---|---|---|
| Requests during one 33 s window after load | 2 | 2 |
| Rows still shown after a failed refresh | **50** | **50** |
| Failure banner | "Couldn't refresh. Showing information received just now." | same |
| Horizontal overflow | 0 px | 0 px |
| Page errors | none | none |

The two requests in a 33-second window are one poll cycle at the 30-second trains cadence,
re-reading the first page of each resource. **No cursor was followed**, which is the rule
that keeps a timer from walking unbounded pagination.

The failure case is the one that matters: with the backend aborting, **all fifty rows
stayed on screen** and only the banner changed. Removing the content would lose information
the commuter already had; showing it unchanged would imply it is current. Framing it as last
received is the honest third option.

## Behaviour proved by the fake-clock suite

Fourteen tests in `tests/refresh.test.ts` cover what a screenshot cannot:

- polling at each resource's own cadence (trains and detail 30 s, alerts 60 s, catalogs 10 min)
- two subscribers to one key sharing **one** request and one timer
- unsubscribing stops the timer while keeping the cached response, so returning is not blank
- hidden documents pause entirely: four intervals passed with zero requests
- a paused resource still notifies, so the age label and outdated wording stay truthful
  without any network call
- becoming visible refreshes immediately when due
- a failed refresh keeps the previous content and records the failure
- backoff doubles from the interval to a 120 s ceiling, verified tick by tick
- a success clears the failure count
- a superseded response is discarded even when it arrives after a newer one
- the in-flight request is aborted when a new one starts
- a timer tick never follows a cursor

## Design checklist

- **What dominates?** Unchanged — the banner is a single small line above the content.
- **Anything duplicated?** The per-screen "Received …" lines and refresh buttons were
  replaced by one shared `Freshness` banner, so the wording now exists once.
- **Severity appropriate?** A failed refresh and an aged cache use the warning tone, not
  critical: the information is still there and still useful, just not current.
- **Unknown distinct from healthy?** Yes, and this ticket adds a second axis: the backend's
  own freshness still describes the evidence, while the banner describes how old *this
  page's copy* is. The two are worded differently and never conflated.
- **Calm?** No spinner replaces content during a background refresh; the button label
  changes and the content stays put.

## Limitations

The 120-second backoff ceiling and the two-missed-interval outdated threshold are exercised
by the fake-clock suite, **not** by a screenshot: reproducing them live would mean sitting
on a broken backend for minutes. The captured failure shows the immediate case.

Ten-minute catalog polling is likewise unit-tested only. Chrome only; not a full
accessibility audit.
