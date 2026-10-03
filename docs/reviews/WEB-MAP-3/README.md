# WEB-MAP-3 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend with
`cmd/ingest` polling the real MDOT feeds. **Real observations, not fixtures.**

| File | Shows |
|---|---|
| `mobile-map-trains.png`, `desktop-map-trains.png` | Train markers and stations over the alignments, with the key and the text equivalent |
| `*-grayscale.png` | Current versus last-known still distinguishable with colour removed |

Observed in this pass: **97 trains, 35 drawn, 8–9 current, 26 last-known, 62 with no position
at all.** Those counts are what the feed happened to carry at roughly 08:00 EDT on 2026-10-02
and will differ at any other time.

Current is a filled disc, last-known a hollow ring. The greyscale capture is the evidence that
**shape**, not colour, carries the distinction.

## Limits

No movement state appears on this screen, by design: `calculated` is absent from the trains
list. A last-known ring and a station dot are both hollow circles differing by size, stroke
weight and the presence of a label — distinguishable here, but the weakest distinction drawn.
