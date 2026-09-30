# Product and design plan

## Direction

Calm, legible, mobile-first transit information. Each screen answers one question. Typography and grouping do most of the work; meaningful sections use whitespace and occasional separators. No KPI-card wall, gradients, decorative charts, brand imitation or gratuitous motion. One excellent light theme first; semantic tokens leave room for later dark mode.

## Information architecture

| URL | Dominant question | Primary content |
|---|---|---|
| `/` — MARC Pulse | How is MARC running right now? | Three line links with accurately scoped reported-status coverage, followed by MARC advisories. Clearly explain unavailable overview data. |
| `/trains` | Which train do I care about? | Line and service-date controls; compact train rows with identity, scheduled time, official status and age. |
| `/trains/[id]` | What is happening with this train? | Identity, official status, movement, location, next stop, trend, freshness, then diagnostics. |
| `/alerts` | Is there anything important I need to know? | Alert titles, descriptions, effect, applicable selectors/timeframes and freshness. |

Navigation is Pulse / Trains / Alerts. Detail back navigation preserves list filters. Main landmark, skip link and visible focus are required. Use lists and headings rather than a dense mobile table. Aim for 44px tap targets; no hover-only controls. At 360px there must be no horizontal page scroll; test long identifiers and translated alert text. Desktop has the same hierarchy with more breathing room, not a dashboard redesign.

## Detail hierarchy and wireframe

```text
Back to trains
[Line name if known] · [verbatim trip identity]

[Official current status / realtime unavailable]    ← dominant
Official MTA · [delay if supported and current]

MARC Now · [Moving / Appears stationary / unavailable]
[Current / last reported coordinates and position age]

Next scheduled stop
[resolved name or stop ID / unavailable / passed final]
[Reported skipped, if applicable]

MARC Now · [trend of official delays]
[Evidence updated time; cache-outdated notice if applicable]

Stop times                                      [expand]
Data status                                     [expand]
```

Direction and train number appear only if a future backend contract supports them. Never extract them heuristically from tripId. Do not duplicate the same official delay in several cards. Raw ingestion IDs, technical reasons and thresholds belong only in diagnostics. Coordinates are an honest interim location fallback; no invented “near Odenton” label. Map follows the core milestone through WEB-MAP-1–5; see [map plan](MAP_PLAN.md).

## Status language

| Evidence | Text and treatment |
|---|---|
| Fresh official ON_TIME | “On time” with restrained positive accent. |
| Fresh official delay | Explicit delay with neutral/informational accent; no giant red surface or invented significant-delay threshold. |
| Official cancellation | “Cancelled” with critical text/accent. |
| CALCULATED STATIONARY | “MARC Now · Appears stationary · [backend duration]”; warning, not an official disruption/cause. |
| CALCULATED MOVING | “MARC Now · Moving”; does not imply on time. |
| Position stale/unavailable | “Position out of date” / “Position unavailable”; retain last coordinates only with historical wording. |
| UNKNOWN or unexpected enum | Neutral “Realtime status unavailable” or context-specific unavailable label; never green/healthy. |
| Usable degraded alerts | Retain alert content with “Alert source degraded”; not fully offline. |
| Refresh failure | “Couldn’t refresh. Showing information received [time]. Try again.” |
| Official stop reported skipped | “Reported skipped” beside that scheduled call, neutral or warning treatment; never advance the next stop yourself. |
| Unrecognized `scheduleRelationship` number | Neutral unavailable label; never guess a meaning from the number. |

`scheduleRelationship` is a nullable **numeric** GTFS-RT enum at both trip and stop level, not a string. WEB-005 owns mapping those numbers to the labels above; only documented values get a label, and anything else is unavailable rather than guessed.

Do not treat movement as severity of official service, or infer cause from stationary evidence. Scheduled times, official estimates and MARC Now calculations always have visible provenance. All status distinctions must survive grayscale and screen readers.

## Minimal design tokens (implemented in WEB-002)

| Category | Implemented foundation |
|---|---|
| Spacing | 4, 8, 12, 16, 24, 32, 48px. Mobile gutter 16px; desktop 24px. |
| Type | System sans; 14px metadata minimum, 16px body, 20px section, 28px title, up to 40px dominant status. Weights 400/500/600; body line-height 1.5; tabular numerals for times/delays. |
| Neutral | Canvas #f7f8f9, surface #ffffff, primary text #18212b, secondary text #52606d, border #d8dee5. |
| Semantic | Positive #17633b, information/focus #174ea6, warning #805600, critical #a52424, unknown #52606d. Text labels always accompany accents. |
| Shape | 4px and 8px radii, 1px subtle border, no shadow by default. |
| Width | Main content max 960px; detail reading column around 720px. |
| Motion | No decorative motion; short disclosure/loading transitions only; disable nonessential transitions under reduced motion. |

Tokens live in app/globals.css; starter layout styles live in app/page.module.css. Names describe roles, not individual components. Text/semantic/focus tokens were measured on both canvas and surface in WEB-002; see the review below. No downloaded font, icon set or component library is installed. Future component combinations must be checked separately.

## Empty, loading and error states

Quiet initial skeletons reflect final geometry. Background refresh preserves layout/content. Empty list: “No scheduled trains for this service date/filter,” not “No active trains.” Empty alerts: “No active MARC alerts reported” only when evidence supports it; otherwise explain lack of current alert information. Empty movement: “Movement data isn’t available for this train yet.” Never render null/undefined, empty cards or a generic fatal error for ordinary absence.

Render stale content with timestamps and explicit last-reported framing. Do not extend stationary duration between polls. Announce meaningful errors/status changes politely, without reading every timestamp tick. Dates/times use schedule timezone with a visible timezone label where ambiguity matters.

## Visual completion gate

Every visual ticket must inspect rendered mobile (360×800) and desktop (1280×900), including long content, loading, empty, errors and actual backend data where feasible. Capture screenshots when tooling permits and record paths/results in the ticket. If a state is inapplicable, explain why. Synthetic scenario screenshots must be labeled. WEB-001 implements only a readable starter page; its rendered review is recorded with the ticket. This does not certify future tokens/screens or a full accessibility audit.

Before DONE, answer: What dominates? Can it be understood in five seconds? Can anything be removed? Is anything duplicated? Could whitespace replace a card? Is severity appropriate? Are unknown/stale distinct from healthy? Is official distinct from calculated? Does mobile work naturally? Does it make sense without color? Are diagnostics too prominent? Does it feel calm? Simplify before completion.

The footer must read exactly: MARC Now DMV is an independent service and is not affiliated with or endorsed by MDOT MTA.

## WEB-004 shell implementation

The shell implements the skip link, header with Pulse/Trains/Alerts navigation, one main
landmark, the constrained content region and the verbatim independence footer. The brand is
a link rather than a heading, so every page keeps a single `h1` naming what it answers. The
current destination uses colour, weight and a persistent underline together with
`aria-current`, never colour alone. Navigation targets measure 44 px.

Navigation labels and the brand override the global `overflow-wrap: anywhere` with
`overflow-wrap: normal`: the global rule exists so a long opaque train identifier cannot
overflow, but it split short labels mid-word at 200% zoom. Long-token wrapping still applies
to content. Evidence is in [the WEB-004 review](reviews/WEB-004/README.md).

## WEB-005 list and detail implementation

The list is ordered by scheduled departure, not by the backend's run-identity pagination
order; the partial notice states that a later page may insert rows above existing ones.
Line and stop names are joined from the catalogs only when schedule versions match, and fall
back to identifiers otherwise. The top-level status is the only current claim; a disagreeing
retained `official.status` is shown as what the operator last published and marked no longer
current. Evidence with no timestamp reads "No report received" as a whole phrase, never a
prefix concatenated onto an absence. Evidence and review limitations are in
[the WEB-005 review](reviews/WEB-005/README.md).

## WEB-007 calculated presentation implementation

Detail follows the wireframe order: official status, MARC Now observed movement with the
reported location, MARC Now next stop, MARC Now trend of official delays, stop times, then
diagnostics. Every calculated value is introduced by "MARC Now ·" and the official block
keeps "Official MTA"; a calculated value never overrides the status above it.

A stationary duration renders only while the state is STATIONARY, because an UNKNOWN
movement can still carry the dwell it once observed. The delay trend is evaluated from
official Trip Updates and survives a stale position. No replacement stop is invented for a
skipped candidate or a passed final stop, and a distance is worded only when the backend
reports metres. The trend's basis delay is named only when it differs from the delay already
shown, so the same figure is never stated in two cards. Raw reasons and thresholds appear
only inside the closed Data status disclosure. Evidence and limitations are in
[the WEB-007 review](reviews/WEB-007/README.md).

## WEB-008 alerts implementation

Advisories render the operator's own words as plain text, never as markup, with links
restricted to http(s). Effect and cause are labelled only from the documented GTFS-RT
tables; anything else reads "not described", and no severity is derived from an effect code.
An empty list reads "No active MARC alerts reported" only when the feed is healthy; a
degraded, stale or unavailable feed reads "Alert information is unavailable" and says that
this is not evidence of undisrupted service, while any retained advisories stay visible with
a label. The scope caveat is stated once for the list, not repeated per advisory. Evidence
is in [the WEB-008 review](reviews/WEB-008/README.md).

## WEB-011 accessibility floor

`npm run e2e` enforces the floor on every screen at both viewports: zero axe violations
(WCAG 2.0/2.1 A and AA), standalone controls at least 44 px, no horizontal scroll at 360 px,
every list in `main` named, exactly one `h1` per page, a focus ring on every keyboard stop,
`--motion-duration` of `0s` under reduced motion, and a failed refresh that retains content
and announces politely. A link inside a sentence is exempt from the target rule, which is
WCAG 2.5.5's inline exception. The standing record, including what is deliberately not
claimed, is [docs/visual-review.md](visual-review.md).

## Map extension

Add Map navigation when WEB-MAP-2 delivers a usable route view; retain the existing Pulse/Trains/Alerts core. System mode answers “Where are the trains right now?” Focus mode emphasizes the selected train and its canonical shape, with persistent shared detail below the map on mobile. Current solid markers and historical outlined markers have explicit text labels; unknown position has a text-list fallback. Follow pauses on manual pan or stale observations. No continuous movement, excessive POIs/controls, giant popups or color-only trust states. See [MAP_PLAN.md](MAP_PLAN.md) for data gates and required map-specific visual scenarios.

## WEB-002 implementation and review

CSS custom properties define the small spacing/type/weight/line-height palette, neutral/semantic colors, borders/radii, responsive gutters/widths, 44px target minimum and focus/motion defaults. Page CSS uses those roles. The starter remains honest about unavailable live service and has one native “About this preview” disclosure to demonstrate surface/border/focus tokens. It does not implement the future application shell or operational status components.

Production Chrome review at 360×800 and 1280×900: no overflow, disclosure height 48px, visible 3px keyboard focus, Enter expands/Space collapses, reduced-motion duration token resolves to zero, and a temporary transition probe is reduced to 0.01ms. Reviewed screenshots include 200% CSS-zoom reflow and explicitly synthetic grayscale/long-identifier scenarios. These stress fixtures are not application content or live observations.

Measured contrast against canvas / surface: primary text 15.29 / 16.26, secondary/unknown 6.07 / 6.46, positive 6.85 / 7.28, information/focus 7.38 / 7.85, warning 6.08 / 6.46, critical 6.86 / 7.30. All tested text pairs exceed 4.5:1; the focus ring exceeds 3:1. The subtle border is decorative grouping, not the sole indication of an interactive control. Controls must retain text/affordances and visible focus; do not use that pale border alone to convey a required state.

Native disclosure text and triangle convey interaction without relying on color. Unknown/stale wording stays distinct from healthy in the grayscale review. No shadow, status-color surfaces or decorative animation was added. This is not a full screen-reader/browser accessibility certification. [Evidence and review limitations](reviews/WEB-002/README.md).
