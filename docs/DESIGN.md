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

Do not treat movement as severity of official service, or infer cause from stationary evidence. Scheduled times, official estimates and MARC Now calculations always have visible provenance. All status distinctions must survive grayscale and screen readers.

## Minimal token plan

| Category | Initial proposal (verify in rendered implementation) |
|---|---|
| Spacing | 4, 8, 12, 16, 24, 32, 48px. Mobile gutter 16px; desktop 24px. |
| Type | System sans; 14px metadata minimum, 16px body, 20px section, 28px title, up to 40px dominant status. Weights 400/500/600; body line-height 1.5; tabular numerals for times/delays. |
| Neutral | Canvas #f7f8f9, surface #ffffff, primary text #18212b, secondary text #52606d, border #d8dee5. |
| Semantic | Positive #17633b, information/focus #174ea6, warning #805600, critical #a52424, unknown #52606d. Text labels always accompany accents. |
| Shape | 4px and 8px radii, 1px subtle border, no shadow by default. |
| Width | Main content max 960px; detail reading column around 720px. |
| Motion | No decorative motion; short disclosure/loading transitions only; disable nonessential transitions under reduced motion. |

Names should describe roles, not individual components. Verify actual text and focus contrast against every background during WEB-002; this plan is not a contrast certification. No downloaded font, icon set or component library is needed initially.

## Empty, loading and error states

Quiet initial skeletons reflect final geometry. Background refresh preserves layout/content. Empty list: “No scheduled trains for this service date/filter,” not “No active trains.” Empty alerts: “No active MARC alerts reported” only when evidence supports it; otherwise explain lack of current alert information. Empty movement: “Movement data isn’t available for this train yet.” Never render null/undefined, empty cards or a generic fatal error for ordinary absence.

Render stale content with timestamps and explicit last-reported framing. Do not extend stationary duration between polls. Announce meaningful errors/status changes politely, without reading every timestamp tick. Dates/times use schedule timezone with a visible timezone label where ambiguity matters.

## Visual completion gate

Every visual ticket must inspect rendered mobile (360×800) and desktop (1280×900), including long content, loading, empty, errors and actual backend data where feasible. Capture screenshots when tooling permits and record paths/results in the ticket. If a state is inapplicable, explain why. Synthetic scenario screenshots must be labeled. WEB-001 implements only a readable starter page; its rendered review is recorded with the ticket. This does not certify future tokens/screens or a full accessibility audit.

Before DONE, answer: What dominates? Can it be understood in five seconds? Can anything be removed? Is anything duplicated? Could whitespace replace a card? Is severity appropriate? Are unknown/stale distinct from healthy? Is official distinct from calculated? Does mobile work naturally? Does it make sense without color? Are diagnostics too prominent? Does it feel calm? Simplify before completion.

The footer must read exactly: MARC Now DMV is an independent service and is not affiliated with or endorsed by MDOT MTA.

## Map extension

Add Map navigation when WEB-MAP-2 delivers a usable route view; retain the existing Pulse/Trains/Alerts core. System mode answers “Where are the trains right now?” Focus mode emphasizes the selected train and its canonical shape, with persistent shared detail below the map on mobile. Current solid markers and historical outlined markers have explicit text labels; unknown position has a text-list fallback. Follow pauses on manual pan or stale observations. No continuous movement, excessive POIs/controls, giant popups or color-only trust states. See [MAP_PLAN.md](MAP_PLAN.md) for data gates and required map-specific visual scenarios.
