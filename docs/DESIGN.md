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
| Per-stop delays with no trip-level status | “No overall status reported” (UNKNOWN) or “No current overall status” (STALE), with the official delay beside it **named with its station**. The normal MARC case; never derive a trip status from stop delays. |

`scheduleRelationship` is a nullable **numeric** GTFS-RT enum at both trip and stop level, not a string. WEB-005 owns mapping those numbers to the labels above; only documented values get a label, and anything else is unavailable rather than guessed.

Do not treat movement as severity of official service, or infer cause from stationary evidence. Scheduled times, official estimates and MARC Now calculations always have visible provenance. All status distinctions must survive grayscale and screen readers.

## Minimal design tokens (implemented in WEB-002)

| Category | Implemented foundation |
|---|---|
| Spacing | 4, 8, 12, 16, 24, 32, 48px. Mobile gutter 16px; desktop 24px. |
| Type | System sans; 14px metadata minimum, 16px body, 20px section, 28px title, up to 40px dominant status. Weights 400/500/600; body line-height 1.5; tabular numerals for times/delays. |
| Neutral | Canvas #f7f8f9, surface #ffffff, primary text #18212b, secondary text #52606d, border #d8dee5. |
| Semantic | Positive #17633b, information/focus #174ea6, warning #805600, critical #a52424, unknown #52606d. Text labels always accompany accents. |
| Shape | 4px, 8px and 12px radii, 1px subtle border, and **one very light shadow** for surfaces that lift off the page (sheets, popovers, the selected-train panel). Superseded the original "no shadow by default" on 2026-10-03; the shadow is a single restrained token, never a depth scale, and never used to carry meaning. |
| Width | Main content max 960px; detail reading column around 720px. |
| Motion | No decorative motion; short disclosure/loading transitions only; disable nonessential transitions under reduced motion. The one substantive exception is a train marker's transition between two **observed** positions ([map plan](MAP_PLAN.md) live movement addendum): bounded at both ends by real data, stopped by stale data, and absent entirely under reduced motion. Motion never implies more certainty than the observation behind it. |

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

## Map rules (from WEB-MAP-6 onward)

A quiet basemap with minimal road and POI detail; zoom and a return-to-system control only;
no giant legend, no noisy popup, no floating panels. Five layers at most: basemap, routes,
stations, active trains, selected train.

A **fresh** position draws a current marker. A **stale** one draws a last-known marker,
distinguished by **shape and label, never colour alone**, with its age — "Last known
position · updated 7 min ago". A stale marker is never animated, never moved and never
counted as a live train.

`STATIONARY` with a fresh position reads "Appears stationary · 6 min", using the backend's
duration. With a stale position the screen reads "Position stale" and makes **no movement
claim**. These are different states and neither is derived from the other in the browser.

Nothing may be available only on the map. A selected train's identity, status, position age,
next stop and movement state also appear in ordinary semantic markup, and the list and detail
screens stay complete without the map. Controls keep 44 px targets and visible focus, and the
map degrades to its text equivalent when the renderer fails or no basemap is configured.

## Map extension

Add Map navigation when WEB-MAP-2 delivers a usable route view; retain the existing Pulse/Trains/Alerts core. System mode answers “Where are the trains right now?” Focus mode emphasizes the selected train and its canonical shape, with persistent shared detail below the map on mobile. Current solid markers and historical outlined markers have explicit text labels; unknown position has a text-list fallback. Follow pauses on manual pan or stale observations. No continuous movement, excessive POIs/controls, giant popups or color-only trust states. See [MAP_PLAN.md](MAP_PLAN.md) for data gates and required map-specific visual scenarios.

## WEB-002 implementation and review

CSS custom properties define the small spacing/type/weight/line-height palette, neutral/semantic colors, borders/radii, responsive gutters/widths, 44px target minimum and focus/motion defaults. Page CSS uses those roles. The starter remains honest about unavailable live service and has one native “About this preview” disclosure to demonstrate surface/border/focus tokens. It does not implement the future application shell or operational status components.

Production Chrome review at 360×800 and 1280×900: no overflow, disclosure height 48px, visible 3px keyboard focus, Enter expands/Space collapses, reduced-motion duration token resolves to zero, and a temporary transition probe is reduced to 0.01ms. Reviewed screenshots include 200% CSS-zoom reflow and explicitly synthetic grayscale/long-identifier scenarios. These stress fixtures are not application content or live observations.

Measured contrast against canvas / surface: primary text 15.29 / 16.26, secondary/unknown 6.07 / 6.46, positive 6.85 / 7.28, information/focus 7.38 / 7.85, warning 6.08 / 6.46, critical 6.86 / 7.30. All tested text pairs exceed 4.5:1; the focus ring exceeds 3:1. The subtle border is decorative grouping, not the sole indication of an interactive control. Controls must retain text/affordances and visible focus; do not use that pale border alone to convey a required state.

Native disclosure text and triangle convey interaction without relying on color. Unknown/stale wording stays distinct from healthy in the grayscale review. No shadow, status-color surfaces or decorative animation was added. This is not a full screen-reader/browser accessibility certification. [Evidence and review limitations](reviews/WEB-002/README.md).

## Visual direction, 2026-10-03: less, but better

A refinement direction, not a restart. The information architecture, the four screens and every
data-trust rule stand; what changes is weight, density and when detail appears.

MARC Now DMV should feel modern, calm, trustworthy and commuter-oriented. It should not read as
an operations console: no dashboard chrome, no badge rows, no card for every value.

### Palette

Measured against `#FFFFFF` surface and `#F8FAFC` background; all clear WCAG AA for normal text.

| Role | Value | On surface | On background |
|---|---|---|---|
| brand | `#155EEF` | 5.41 | 5.17 |
| brand hover | `#0F4CCB` | 7.20 | 6.88 |
| text | `#0F172A` | 17.85 | 17.06 |
| text secondary | `#475569` | 7.58 | 7.24 |
| muted / unknown | `#64748B` | 4.76 | 4.55 |
| healthy | `#15803D` | 5.02 | 4.79 |
| warning / degraded | `#B45309` | 5.02 | 4.80 |
| delay / critical | `#B42318` | 6.57 | 6.28 |
| border | `#E2E8F0` | 1.23 (non-text) | — |

This palette is **uniformly lower contrast than the one it replaces** — brand falls from 7.85
to 5.41 — so it is a deliberate softening that still clears AA, not an improvement in
legibility. `muted` at 4.55 on the background is the tightest value in the set, and any later
change to the background must re-run these figures.

`muted` and `unknown` are the **same colour**, which is the clearest possible reason why an
unknown or stale state must always say so in words.

Colour carries meaning but never carries it alone, and ordinary states never get large red or
orange surfaces.

### Density and disclosure

Prefer typography, spacing and separators over another bordered box. A card should represent a
meaningful group, not a single value. Badges are for the rare, load-bearing fact — `Moving`,
`+8 min`, `Modified service` — and never five in a row.

Put technical and explanatory material behind progressive disclosure rather than deleting it.
Everything this service refuses to claim must stay readable; it just stops competing with the
status it qualifies.

### Measured starting point, 360×800, 2026-10-03

| Screen | Height | Note |
|---|---|---|
| Alerts | 5,823 px / 11 advisories | 1,051 px each; the operator's full notice renders inline |
| Trains | 3,122 px / 18 rows | 113 px per row, and 18 is a **Saturday**; a weekday is 97 |
| Pulse | 1,224 px | already the calmest screen; 3 bordered boxes |

### The visual north star, 2026-10-03

The reference mockups are in [`design-reference/`](design-reference/):
`screens-desktop-and-mobile.png` (all four screens plus six mobile views),
`desktop-composition.png` (the three-pane desktop home) and
`pulse-by-time-of-day.png` (Pulse at 1:43 AM, 8:12 AM and 4:26 PM).

**Everything in them is synthetic.** Train 413, +8 min, BWI Airport, 4.2 mi, "Near Odenton, MD",
the advisory wording, the line colours and every count are mockup values. None is backend data
and none may be reproduced as a value.

What they establish: a bright off-white canvas, one deep blue accent, restrained amber/red/green
semantics, generous whitespace, subtle borders, light shadows, moderate rounded corners, compact
rows separated by rules rather than wrapped in cards, a dominant map, and bottom sheets on
mobile. They are visually calm **without being sparse** — every row carries real information.

#### Where the reference and the real data disagree

These are not criticisms of the mockups, which are visual documents. They are the points where
following them literally would make the product lie.

| Reference shows | Reality | What we do |
|---|---|---|
| `Penn → Washington` on every row | 9 of 18 Penn trains on 2026-10-03 were headed to **Baltimore** | Line and destination stay separate: line from `longName`, destination from `scheduled.headsign` |
| `+8 min` · `Official (MTA)` prominently | MDOT publishes **no trip-level delay or status** on this feed | The badge is the exception; rows are designed for "Realtime status unavailable" first |
| `5 trains active (now or recently)` | MARC-508 deliberately refused to publish an `active` boolean | Say which fact is being counted, never "active" |
| `1 reported delayed` | Requires an official delay, usually absent | Only shown when the operator published one |
| `Current location: Near Odenton, MD` | The backend publishes coordinates, not place names | **Not implemented.** Reverse geocoding is inference the backend does not make |
| Penn blue, Camden purple, Brunswick orange | The feed publishes `color: FF8000` for **all three** routes, and `FF8000` on white is ~2.2 contrast | Distinct line colours may be assigned as **ours**, never presented as the operator's, never the only way a line is identified, and never used for text at that contrast |
| `BWI Airport · 4.2 mi` | Distances are metres behind a `units` guard | Convert for display only when `units` says `meters` |

#### Service-state awareness, the reference's best idea

`pulse-by-time-of-day.png` shows Pulse in three states: service ended for the night with the
next departure, between trains with a countdown, and in service with live counts. This is a
genuine product improvement and not merely visual — at 01:40 on 2026-10-03 the real app showed
"0 of 18 trains report a current position", which reads as a broken app rather than as a
sleeping railway. Both the state and the next scheduled departure are honest: they come from the
timetable, not from inference. [WEB-UI-08](tickets/WEB-UI-08.md) owns it.

### The train-row rule

A list row carries: scheduled time, identifier, **line and destination as separate facts**, and
a status. Rows are separated by rules, never wrapped one card each — a weekday list is 97 of
them.

A sentence identical on every row is said **once for the list** instead, and only while it
applies to every row; the moment one differs, every row states its own again, so an absent line
can never imply a status a row does not have. Measured: this is 74 px per row against 99 px.

The line is the operator's `longName`, shortened ("PENN - WASHINGTON" → "Penn Line"), because
`shortName` is `"MARC"` on every route. The destination is `scheduled.headsign`. **They are
never joined into a journey**: on 2026-10-03, 9 of 18 trains on `PENN - WASHINGTON` were headed
to Baltimore.

### What refinement may not do

It may not add a request per row or per marker, collapse the three membership facts into one
flag, merge a route name with a destination, parse an operator's prose into fields, or make a
stale value read as current. Accuracy wins over elegance, every time.

