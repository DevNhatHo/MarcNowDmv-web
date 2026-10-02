# Local frontend roadmap

The original 12-ticket core milestone is followed by five required map tickets; neither milestone is a production deployment plan. [Ticket index](tickets/README.md) is the status source alongside current state. Complete one ticket at a time. Planning is complete; WEB-001 and WEB-002 are DONE, and WEB-003 is next.

## Dependency order

Recommended linear order: WEB-001 → WEB-002 → WEB-003 → WEB-004 → WEB-005 (list and detail, absorbing the former WEB-006) → WEB-007 → WEB-008 → WEB-009 → WEB-010 → WEB-011 → WEB-012.

Actual dependencies: 002←001; 003←001; 004←002; 005←003+004; 006←005; 007←006; 008←003+004; 009←005+008; 010←007+008+009; 011←010; 012←011. The linear sequence is convenient; it is not a requirement to introduce parallel agents.

## Visible milestones

- WEB-004: first polished visible shell at localhost:3000 with working navigation and independence statement; route placeholders are honest and contain no fake live data.
- WEB-005: first useful real-data demo: line/date-filtered schedule, official status and timestamps, clear unknown/empty/error states. This validates basic contract access.
- WEB-007: flagship train-detail demo: official status alongside distinctly labeled MARC Now movement/next-stop/trend, with independent freshness. Fresh calculated states may need clearly labeled synthetic examples when retained local data is stale.
- WEB-012: complete local four-screen experience, bounded polling, design/accessibility review and actual frontend/backend smoke results.

## Deferred

Map is now planned explicitly in WEB-MAP-1–5 after the core milestone; geometry and active-membership APIs gate the corresponding implementation tickets. Active-running summaries and missing display metadata are [backend proposals](BACKEND_GAPS.md), not frontend inventions. Authentication, accounts, notifications, analytics, historical intelligence, dark mode and AWS are outside this milestone. Completing WEB-012 does not authorize cloud deployment or further features.

## Required map follow-on

[Map plan](MAP_PLAN.md): WEB-012 → WEB-MAP-1 (technology/contracts) → WEB-MAP-2 (canonical routes) → WEB-MAP-6 (MapLibre renderer, done) → WEB-MAP-3 (active/current and last-known markers) → WEB-MAP-4 (focus/follow) → WEB-MAP-7 (smooth transitions between observed positions) → WEB-MAP-5 (shared detail/navigation and integration review). WEB-MAP-7 comes from the **live movement addendum** of 2026-10-02: markers transition between two observed positions and stop, and never extrapolate past the newest one.

WEB-MAP-2 additionally requires delivered BACKEND-UI-03 geometry; WEB-MAP-3 requires delivered BACKEND-UI-02 active-set semantics. Both are separately proposed backend tasks, not authorization to implement backend changes. WEB-MAP-1 may document those blockers without pretending APIs exist. WEB-MAP-5 completes the map extension; WEB-012 still completes the original four-screen core. Missing display metadata uses safe fallbacks. First route-map demo is WEB-MAP-2; live/last-known system demo is WEB-MAP-3; integrated selected-train experience is WEB-MAP-5.

## Map SDK

**MapLibre GL JS** is the chosen renderer from 2026-10-01, with a no-API-key hosted vector basemap initially and self-hosted PMTiles as the documented future option; the ADR and the comparison against ArcGIS, Mapbox, Leaflet and OpenLayers are in [MAP_PLAN.md](MAP_PLAN.md), and [WEB-MAP-6](tickets/WEB-MAP-6.md) migrates the shipped Leaflet map. The renderer renders; the backend remains the source of all geometry, position, membership, movement and freshness.
