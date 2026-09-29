# Local frontend roadmap

This is a 12-ticket milestone, not a production deployment plan. [Ticket index](tickets/README.md) is the status source alongside current state. Complete one ticket at a time; no implementation was performed during planning.

## Dependency order

Recommended linear order: WEB-001 → WEB-002 → WEB-003 → WEB-004 → WEB-005 → WEB-006 → WEB-007 → WEB-008 → WEB-009 → WEB-010 → WEB-011 → WEB-012.

Actual dependencies: 002←001; 003←001; 004←002; 005←003+004; 006←005; 007←006; 008←003+004; 009←005+008; 010←007+008+009; 011←010; 012←011. The linear sequence is convenient; it is not a requirement to introduce parallel agents.

## Visible milestones

- WEB-004: first polished visible shell at localhost:3000 with working navigation and independence statement; route placeholders are honest and contain no fake live data.
- WEB-005: first useful real-data demo: line/date-filtered schedule, official status and timestamps, clear unknown/empty/error states. This validates basic contract access.
- WEB-007: flagship train-detail demo: official status alongside distinctly labeled MARC Now movement/next-stop/trend, with independent freshness. Fresh calculated states may need clearly labeled synthetic examples when retained local data is stale.
- WEB-012: complete local four-screen experience, bounded polling, design/accessibility review and actual frontend/backend smoke results.

## Deferred

Map awaits core detail and a usable geometry contract; no map implementation ticket is included yet. Active-running summaries and missing display metadata are [backend proposals](BACKEND_GAPS.md), not frontend inventions. Authentication, accounts, notifications, analytics, historical intelligence, dark mode and AWS are outside this milestone. Completing WEB-012 does not authorize cloud deployment or further features.
