# WEB-005 rendered review

Production build served by `npm start`, driven in installed Chrome at 360×800 and 1280×900
against the **real local backend** (`cmd/api` on 127.0.0.1:8080 reading the retained
`marc_208_live` database). No feed was ingested and no schema was changed.

## Screenshots

| File | What it shows |
|---|---|
| `mobile-list.png`, `desktop-list.png` | the service-date list with real schedule rows |
| `mobile-detail.png`, `desktop-detail.png` | a real train's detail, reached by clicking a row |
| `mobile-detail-data-status.png`, `desktop-detail-data-status.png` | the Data status disclosure opened |
| `mobile-detail-grayscale.png`, `desktop-detail-grayscale.png` | grayscale, for colour independence |
| `mobile-list-empty.png`, `desktop-list-empty.png` | a service date with no scheduled trains |
| `mobile-detail-missing.png`, `desktop-detail-missing.png` | an unknown train identifier |

## Measurements and live observations

| Measurement | Mobile | Desktop |
|---|---|---|
| Rows on the first page | 50 | 50 |
| Rows after "Load more" | 96 (the whole service date) | 96 |
| Chronologically ordered | yes, 04:50 → 20:05 | yes |
| Horizontal page overflow | 0 px | 0 px |
| Smallest interactive target | 44 px | 44 px |
| Unexpected console errors | none | none |

Live row text: `04:50 | Train870 | BRUNSWICK - WASHINGTON | Realtime status unavailable | No
report received`. The line name resolved from the route catalog because its schedule version
matched the page's.

Live detail text: identity `Train870`, line `BRUNSWICK - WASHINGTON`, `Scheduled for Wed, 30
Sept 2026 · 04:50 EDT`, dominant `Realtime status unavailable`, provenance `Official MTA ·
No delay reported · No report received`, then `Position unavailable`. Every value is an
honest statement about absent evidence; nothing reads as a positive claim.

The only failed requests in the whole session were the two deliberate probes of
`/api/v1/trains/not-a-real-token`, which correctly returned 404 and rendered "That train
isn't available".

## The WEB-003 browser check, now discharged

WEB-003 could verify the same-origin proxy only over HTTP, because it added no UI. Both
screens now drive the typed client from a real browser: every list, catalog and detail read
went through `/api/backend/...` on the frontend origin, **no CORS error appeared**, and no
page error or unexpected console error was recorded at either viewport.

## Defects found by looking, not by tests

1. **Rows read "Reported not reported".** `describeAge` returns "not reported" for absent
   evidence, and the row prefixed it with "Reported". Every automated check passed. Fixed
   with `describeReport`, which owns the absent case, plus a regression test naming the
   original wording.
2. **The list arrived in backend order.** The backend paginates by run identity, so times
   ran 19:45, 15:40, 06:12, 17:20 — close to unusable for a screen whose question is which
   train to catch. Rows are now ordered by scheduled departure. Sorting is presentation over
   published scheduled times and infers nothing; because a later page can insert rows above
   existing ones, the partial notice says so explicitly.
3. **Detail showed the raw route id `11706`** where the list showed `CAMDEN - WASHINGTON`.
   Detail now reads the route catalog too, under the same schedule-version rule as stop
   names.

## Design checklist

- **What dominates?** The list: the scheduled departure time, set large with tabular
  numerals. The detail: the current status, at display size. Both answer their screen's
  question first.
- **Understandable in five seconds?** Yes. A row is time, identity, line, status, age.
- **Anything removable or duplicated?** The official delay appears once per screen. The row
  shows a delay only where one was published or the evidence is current, so a retained row
  is not padded with meaningless zeros.
- **Severity appropriate?** No status colour fills a surface anywhere; tone is carried by
  text colour and wording. Unknown uses the neutral grey, never green.
- **Unknown distinct from healthy?** Yes, and verified against live retained data: every row
  reads "Realtime status unavailable" with "No report received", and nothing reads "On
  time". A retained `official.status` that disagrees with the current claim is shown as what
  the operator *last published*, explicitly marked no longer current.
- **Official distinct from calculated?** No calculated value is rendered at all; WEB-007 owns
  that. Scheduled times and official estimates sit in separate columns of the same row, and
  the caption states that nothing there is calculated.
- **Does mobile work naturally?** Yes: single column, 0 px overflow, 44 px targets, filters
  wrap above the list.
- **Without colour?** Yes; the grayscale captures keep status wording and hierarchy legible,
  because every tone is also a distinct phrase.
- **Diagnostics too prominent?** Feed health and schedule version live inside a closed "Data
  status" disclosure.
- **Calm?** One border weight, no shadow, no motion, no filled status blocks.

## Limitations

The retained database holds no fresh realtime evidence, so **no live ON_TIME, delayed,
cancelled or fresh-position row was observed**. Those branches are covered by unit tests
over captured and clearly synthetic fixtures, not by a screenshot, and this review does not
claim otherwise. The loading state is captured only incidentally, because the local backend
answers in well under a second.

Chrome only; this is not a full accessibility audit or a screen-reader certification.
