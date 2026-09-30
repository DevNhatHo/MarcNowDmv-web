# WEB-008 rendered review

Production build served by `npm start`, driven in installed Chrome at 360×800 and 1280×900.
The real screen came from the live local backend (`cmd/api` reading retained
`marc_208_live`); the other four were produced by intercepting the alerts response.

## Screenshots

| File | What it shows |
|---|---|
| `*-real-retained.png` | the four real retained MARC advisories |
| `*-real-grayscale.png` | the same screen in grayscale |
| `*-synthetic-empty-healthy-feed.png` | no advisories, healthy feed |
| `*-synthetic-empty-unavailable-feed.png` | no advisories, unusable feed |
| `*-synthetic-degraded-feed.png` | advisories retained while the feed is degraded |
| `*-synthetic-stress-text-and-unsafe-link.png` | long title, markup in text, unbroken token, `javascript:` link, untitled advisory |

SYNTHETIC files are invented for this review. The real feed state is what the backend
reported; the empty and degraded variants were substituted to exercise branches the
retained data does not produce.

## Observed behaviour

| Scenario | Advisories shown | Unsafe hrefs | Scope caveats | What it says |
|---|---|---|---|---|
| Real retained | 4 | 0 | 1 | four operator advisories with effect, cause and periods |
| Empty, healthy feed | 0 | 0 | 0 | "No active MARC alerts reported" |
| Empty, unusable feed | 0 | 0 | 0 | "Alert information is unavailable" |
| Degraded feed | 4 | 0 | 1 | "Alert source degraded … may be incomplete", content retained |
| Stress | 2 | **0** | 1 | "Effect not described", "Cause not described", "Advisory published without a title" |

Horizontal page overflow was **0 px in every scenario at both viewports**, including the
stress case with an unbroken base64-style token. No page errors were recorded.

The two rules that matter most are visible in the table. **An empty list only claims good
news when the evidence supports it**: with a healthy feed it reads "No active MARC alerts
reported", and with a degraded, stale or unavailable feed it reads "Alert information is
unavailable … not evidence that MARC service is running without disruption". And **a
degraded feed is not treated as offline**: all four advisories stay visible with a label
saying they may be incomplete.

The stress capture confirms the sanitization rules in a real browser: `<b>not bold</b>`
renders as those literal characters rather than bold text, and the `javascript:` URL
produced **no link at all** — zero non-http(s) hrefs anywhere on the page.

## Design checklist

- **What dominates?** Each advisory's title, at section size. The page answers "is there
  anything I need to know?" with the operator's own words.
- **Understandable in five seconds?** Yes: title, then effect/cause/period, then the text.
- **Anything duplicated?** This was a finding. The scope caveat originally repeated verbatim
  on every card — four identical sentences on the real screen. It is now stated **once** for
  the whole list, which a test pins.
- **Severity appropriate?** No severity is derived from the effect code at all. A parking
  advisory is not styled like a suspension, because the feed does not rank them and
  inventing a ranking would be inventing operator information. Only the feed-health banner
  uses the warning tone.
- **Unknown distinct from healthy?** Yes. Undocumented cause and effect numbers read
  "not described"; an advisory with no title still appears, labelled as published without
  one; an absent period reads "No active period given".
- **Official distinct from calculated?** Nothing calculated appears on this screen.
- **Does mobile work naturally?** Yes; single column, 0 px overflow, long text wraps.
- **Without colour?** Yes — the grayscale capture stays fully legible, because every state
  is a phrase rather than a colour.
- **Diagnostics too prominent?** No raw identifiers, snapshot tokens or health vocabulary
  appear; the feed state is rendered as a sentence.
- **Calm?** One card border, no shadow, no motion, no status surfaces.

## Limitations

The retained alerts feed is a **completed-day snapshot**, so "Reported 1 day ago by the
operator" is accurate and the advisories are historical. A live feed with a current
timestamp has not been observed on this screen.

The real capture happens to contain **two advisories sharing the same Odenton title**, which
conveniently exercises the distinct-identity rule with real data rather than a fixture.

The loading state is captured only incidentally, because the local backend answers in well
under a second. Chrome only; not a full accessibility audit. Links open in a new tab with
`rel="noreferrer noopener"`, but no external link was actually followed during this review.
