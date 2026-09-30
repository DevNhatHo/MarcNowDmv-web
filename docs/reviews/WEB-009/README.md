# WEB-009 rendered review

Production build served by `npm start`, driven in installed Chrome at 360×800 and 1280×900
against the live local backend (`cmd/api` reading retained `marc_208_live`).

## Screenshots

| File | What it shows |
|---|---|
| `mobile-pulse.png`, `desktop-pulse.png` | the home overview with real data |
| `mobile-pulse-grayscale.png`, `desktop-pulse-grayscale.png` | grayscale, for colour independence |
| `mobile-line-filtered-list.png`, `desktop-line-filtered-list.png` | the list reached by following a line link |

## Observed behaviour

Requests made on load, at both viewports, in order:

```
/api/v1/trains?limit=200
/api/v1/routes?limit=200
/api/v1/alerts?limit=20
```

**Exactly three bounded reads.** No per-train detail request, no cursor follow, no page
walking — verified by inspecting every request the page issued and asserted by a test.

| Measurement | Mobile | Desktop |
|---|---|---|
| Line sections | 3 | 3 |
| Horizontal overflow | 0 px | 0 px |
| Page errors | none | none |

Live copy, with the retained data:

- "Based on 96 scheduled trains for Wed, 30 Sept 2026, the whole service date."
- "BRUNSWICK - WASHINGTON — 18 scheduled. The operator is not currently reporting status
  for any of them." (and the same for CAMDEN, 20, and PENN, 58)
- "These figures count scheduled trains and the operator's own reports. They do not say how
  many trains are running now, which this service cannot determine."

Each line link carried both filters, for example
`/trains?serviceDate=20260930&routeId=11704`, and following one landed on that exact
filtered list.

## Defects found by looking

1. **"Received Reported just now"** — the screen prefixed `describeReport`, which already
   begins with a verb. Same class of defect as WEB-005's "Reported not reported"; the prefix
   is gone and a test asserts the string never reappears.
2. **"1 more retained advisory are not shown here."** — the noun was pluralised but the verb
   was not. Both now agree, covered by singular and plural tests.

## Design checklist

- **What dominates?** The coverage sentence and the three line links. The screen answers
  "how is MARC running?" with what is actually known.
- **Understandable in five seconds?** Yes: scope, three lines, advisories.
- **Anything duplicated?** The advisory preview shows three and says how many more exist
  rather than repeating the alerts screen.
- **Severity appropriate?** No line is coloured by state. With no current reports there is
  nothing to rank, and ranking absence would be the fabrication this ticket forbids.
- **Unknown distinct from healthy?** This is the screen's whole point, and the live capture
  demonstrates it: every line reads "The operator is not currently reporting status for any
  of them", never "on time", "normal" or "good". A test asserts those words cannot appear
  for an unreported line.
- **Official distinct from calculated?** Nothing calculated appears. No active or stationary
  count is produced, because the backend defines no current-running semantics
  (BACKEND-UI-02).
- **Does mobile work naturally?** Yes; one column, 0 px overflow.
- **Without colour?** Yes — grayscale keeps every line's state legible, because each is a
  sentence.
- **Diagnostics too prominent?** None appear.
- **Calm?** Three cards, one rule per section, no motion.

## Limitations

The retained database reports no current status for any train, so **the partly-reported and
disrupted-line wordings were never exercised against live data**; they are covered by unit
tests over constructed trains. The screen's most interesting real state is the honest
"nothing is being reported" one, which is what the captures show.

The coverage sentence read "the whole service date" because 96 trains fit inside one
200-row page. The partial-view wording is unit-tested but not captured live.

Chrome only; not a full accessibility audit.
