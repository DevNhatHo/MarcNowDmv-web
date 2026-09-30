# WEB-007 rendered review

Production build served by `npm start`, driven in installed Chrome at 360×800 and 1280×900.
The real screen came from the live local backend (`cmd/api` reading retained
`marc_208_live`); the other six were produced by intercepting the detail response and
substituting a **synthetic** body, so the real UI renders invented data.

## SYNTHETIC scenarios are not observations

The retained database contains no fresh realtime evidence, so every calculated object it
returns is UNKNOWN. The fresh branches below were **invented for this review**. Each file is
named `*-synthetic-*` and nothing in them may be described as live service, observed
movement or real MARC operations.

They also deliberately leave the envelope's top-level `status` at its captured `UNKNOWN`
while supplying a fresh official delay. That pairing would not occur together in real data;
it is retained here because it demonstrates the rule that matters most — **a calculated
value never overrides or repairs the official status above it.**

## Screenshots

| File | What it shows |
|---|---|
| `*-real-retained.png` | live retained data: every calculation UNKNOWN |
| `*-synthetic-stationary.png` | STATIONARY with dwell, IDENTIFIED next stop, WORSENING trend |
| `*-synthetic-moving.png` | MOVING with an IMPROVING trend |
| `*-synthetic-lost-tracking-historic-dwell.png` | UNKNOWN movement still carrying 900 s of historic dwell |
| `*-synthetic-stale-gps-live-trend.png` | stale position with a valid independent trend |
| `*-synthetic-skipped-candidate.png` | the operator reported the identified stop skipped |
| `*-synthetic-passed-final.png` | past the last scheduled stop |
| `*-synthetic-stationary-grayscale.png` | grayscale, for colour independence |
| `*-synthetic-diagnostics.png` | the Data status disclosure opened |

## Observed behaviour

| Scenario | Movement | Next stop | Trend |
|---|---|---|---|
| Real retained | Movement unavailable | Next stop unavailable | Delay trend unavailable |
| Stationary | Appears stationary · 2 min | Next scheduled stop, 1.4 km away | Official delay worsening |
| Moving | Moving | Next scheduled stop | Official delay improving |
| Lost tracking, historic dwell | Movement unavailable | Next stop unavailable | Official delay worsening |
| Stale GPS, live trend | Movement unavailable | Next stop unavailable | **Official delay improving** |
| Skipped candidate | Appears stationary · 2 min | Next scheduled stop + "The operator reported this scheduled stop skipped." | Official delay worsening |
| Passed final | Appears stationary · 2 min | Passed its final scheduled stop | Official delay worsening |

Measurements at both viewports: horizontal page overflow **0 px**, no page errors, no
unexpected console errors.

The two rules most easily got wrong are visible in the table. **The historic dwell is
withheld**: the lost-tracking scenario carries `stationarySeconds: 900` and the page shows
no duration at all, reading "Movement unavailable" with "That is not the same as a stopped
train". And **a stale position does not erase the trend**: the stale-GPS scenario reports
movement unavailable while still reporting "Official delay improving", because the trend is
measured from official Trip Update evidence, not from GPS.

## Design checklist

- **What dominates?** The official status, at display size. Every calculated block is one
  step down in the hierarchy and is introduced by "MARC Now ·".
- **Understandable in five seconds?** Yes: status, then movement, then next stop, then
  trend, in the order the design wireframe specifies.
- **Anything duplicated?** This was a finding. The trend's basis delay restated the delay
  already shown in the official line whenever the two agreed, which DESIGN.md forbids. The
  basis is now named **only when it differs**; all six synthetic captures show the delay
  figure exactly once.
- **Severity appropriate?** Stationary uses the warning tone because it is worth noticing,
  not the critical tone, because it is not an official disruption. Moving uses the
  informational tone and never implies punctuality.
- **Unknown distinct from healthy?** Yes. Every unavailable calculation says so in words and
  uses the neutral unknown tone, and each explains what it does not know.
- **Official distinct from calculated?** Every calculated value carries the "MARC Now"
  source line; the official block keeps "Official MTA". No calculated value changes the
  status above it, which the synthetic status pairing demonstrates directly.
- **Does mobile work naturally?** Yes; 0 px overflow at 360 px with the blocks stacked.
- **Without colour?** Yes — the grayscale capture keeps every state distinguishable, because
  each tone is also a distinct phrase.
- **Diagnostics too prominent?** Raw reasons (`source_stale`), thresholds, corridor width,
  window and tolerance appear **only** inside the closed Data status disclosure; a test
  asserts they are absent from the rest of the page.
- **Calm?** No new colour surfaces, borders or motion were introduced.

## Limitations

No fresh MOVING, STATIONARY, MEASURED or non-UNKNOWN trend has ever been observed from the
real backend, so the six scenarios above are screenshots of **synthetic data in the real
UI**, not evidence about MARC operations. Only the `*-real-retained.png` pair shows live
data, and it is entirely UNKNOWN.

Route progress is parsed and reported in diagnostics but has no commuter-facing
presentation: without route geometry there is nothing meaningful to draw, and
BACKEND-UI-03 gates that. Chrome only; not a full accessibility audit.
