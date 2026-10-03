# WEB-MAP-5 — rendered review

Production build, system Chrome, 360×800 and 1280×900, against the local backend with
`cmd/ingest` polling. **Real observations.** Captured by walking the whole journey: system map
→ focus → full detail.

| File | Shows |
|---|---|
| `mobile-detail-with-map.png`, `desktop-detail-with-map.png` | Train detail with its embedded focused map, the Back-to-map link and the link onward to the system map |
| `*-grayscale.png` | The same with colour removed |

The captured train stated `Movement unavailable — There are not enough recent positions to tell
whether this train is moving. That is not the same as a stopped train.`, `Reported location
39.30767, -76.61607 · Reported 1 min ago`, and next stop `PENN STATION MARC nb · 43 m away
along the route`. The map draws exactly that and claims nothing further.

Page height with the map embedded: **2,416 px** desktop, **2,729 px** mobile, no horizontal
overflow at either width.

## The point of this review

Everything the embedded map draws is already stated in text above it. The map is additive, and
an e2e test blocks the geometry request to prove the screen stays complete without it.

## Limits

The map fits to the whole alignment, so on a long line the train marker can sit near an edge
and its label can clip at the viewport boundary, as the mobile capture shows. The text
equivalent above carries the same facts, so nothing is lost.
