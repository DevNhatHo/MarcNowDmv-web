# WEB-013 rendered review

Production build in installed Chrome at 360×800 and 1280×900, against the **live** local
backend with `cmd/ingest` having just polled the real MDOT MTA feeds.

## Screenshots

| File | What it shows |
|---|---|
| `*-live-detail.png` | a real train with per-stop delays and no trip-level status |
| `*-live-detail-grayscale.png` | the same screen in grayscale |
| `*-live-list.png`, `*-live-pulse.png` | the list row and line summary for the same data |

## The contradiction, before and after

Before, on live data:

> **Realtime status unavailable**
> Official MTA · No delay reported · Reported just now
> … *MARC Now · trend of official delays* — "Measured against the operator's published
> delay of 1 min 2 sec late."

After:

> **No overall status reported**
> Official MTA · 35 sec early at EDGEWOOD MARC nb · Reported 2 min ago
> *The operator publishes a delay for each stop rather than one for the whole trip. Other
> stops on this trip may report a different figure.*
> … "Measured at UNION STATION MARC Washington's departure, against a published delay of
> 1 min 2 sec late."

Identical at both viewports, 0 px horizontal overflow, no page errors.

Two official figures still appear, and that is correct — the operator really did publish
−35 s at Edgewood and +62 s at Union Station. They no longer read as a contradiction because
**each names the station it belongs to**.

## Why the delays differ so much

The live train carried a different delay at nearly every call: −48 s, −21 s, +21 s, +72 s,
+213 s, +165 s, +258 s, +120 s, +182 s. There is no single "the delay" to quote, which is
why the screen names a stop rather than picking a number and presenting it as the train's
state.

The figure shown is the delay at the **calculated next stop** when that stop is identified —
the one a waiting commuter actually cares about — falling back to the operator's
furthest-ahead report otherwise.

## Design checklist

- **What dominates?** Still the status line. It now says what is missing rather than implying
  nothing is known.
- **Anything duplicated?** No. When the trend's basis equals the figure beside the status it
  is suppressed; when it differs, both name their station.
- **Severity appropriate?** Unchanged — the unknown tone, never a positive one.
- **Unknown distinct from healthy?** Yes, and more precisely than before: "No overall status
  reported" is narrower than "Realtime status unavailable" without being any more
  reassuring. Tests assert neither wording can read as "on time", "normal" or "fine".
- **Official distinct from calculated?** The stop figure is Official MTA; the trend is MARC
  Now. The calculated next stop *selects which* official figure to show but contributes no
  value of its own.
- **Without colour?** Yes; the grayscale capture is fully legible.

## Limitations

Only the UNKNOWN and STALE cases were observed live, because MDOT publishes no trip-level
status at all — which is precisely the finding. A train with a genuine trip-level ON_TIME or
DELAYED has never been seen from this feed, so that path rests on captured and synthetic
fixtures.

The list and Pulse changes are **restraint, not new information**: both endpoints carry no
stop updates, so they now avoid implying an absence they cannot establish. Chrome only; not
a full accessibility audit.
