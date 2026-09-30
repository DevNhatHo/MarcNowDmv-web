# WEB-011 rendered review

Production build in installed Chrome at 360×800 and 1280×900 against the live local backend.
The durable summary is in [docs/visual-review.md](../../visual-review.md); this record holds
the evidence for the pass itself.

## Screenshots

| File | What it shows |
|---|---|
| `*-pulse.png`, `*-trains.png`, `*-alerts.png`, `*-detail.png` | all four screens after the fixes |
| `*-focus-back-link.png` | a standalone link focused, showing the ring and its target height |
| `*-alerts-zoom-200.png` | the busiest screen at 200% root font size |
| `*-alerts-grayscale.png` | the same screen in grayscale |

## Result

Across all eight screen-and-viewport combinations:

| Check | Before | After |
|---|---|---|
| axe violations | 0 | 0 |
| Undersized standalone controls | 11 across 4 screens | **0** |
| Unnamed lists in `main` | 8 | **0** |
| Keyboard stops without a ring | 1 (date input, page CSS) | **0** |
| Polite live regions | 0 | 1 per screen |
| Horizontal overflow | 0 px | 0 px |

## Design checklist, applied across all four screens

- **What dominates?** Each screen leads with its own question's answer: Pulse with coverage
  and lines, Trains with departure times, Detail with the official status, Alerts with the
  advisory titles.
- **Anything duplicated?** The per-screen "Received …" lines and refresh buttons were
  consolidated into one `Freshness` banner by WEB-010; WEB-008's repeated scope caveat and
  WEB-007's repeated delay figure were both reduced to a single statement.
- **Severity appropriate?** No status colour fills a surface anywhere in the app. Warning is
  used for stationary movement, an out-of-date cache and a failed refresh; critical only for
  a cancellation or a hard failure.
- **Unknown distinct from healthy?** Verified against live data, which is entirely unknown:
  every line reads "not currently reporting", every train "Realtime status unavailable",
  every calculation "unavailable". The word "on time" appears nowhere on the live screens.
- **Official distinct from calculated?** Every calculated value carries "MARC Now ·"; every
  official one "Official MTA". Neither ever overrides the other.
- **Does mobile work naturally?** 0 px overflow on every screen, including a long unbroken
  identifier and 200% zoom.
- **Without colour?** The grayscale captures stay fully legible, because every state is a
  phrase before it is a tone.
- **Diagnostics too prominent?** Raw reasons, thresholds and source health live only inside
  closed disclosures.
- **Calm?** One border weight, no shadow, no decorative motion, no status surfaces.

## Limitations

Stated in full in [docs/visual-review.md](../../visual-review.md). In short: this is an
automated floor plus a one-browser rendered review, not a certified audit; no screen reader
was driven; one native `<input type="date">` sub-part cannot take page CSS and is documented
rather than fixed; and the delayed, cancelled, moving and stationary presentations were
reviewed against clearly labelled synthetic fixtures, because live retained data never
produces them.
