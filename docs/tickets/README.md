# Frontend ticket index

**The core local milestone is complete**: WEB-001 through WEB-012 are DONE (WEB-006 was merged into WEB-005). [WEB-MAP-1](WEB-MAP-1.md) is DONE. Three follow-on tickets were opened from verified findings: Recommended next: **[WEB-015](WEB-015.md)**. WEB-MAP-2 through WEB-MAP-5 remain blocked on backend contracts that do not exist, and this repository must not modify the backend. Resume IN_PROGRESS work before choosing a new ticket. Work is committed here and pushed to `origin/main`.

| Ticket | Title | Dependencies | Status |
|---|---|---|---|
| [WEB-001](WEB-001.md) | Bootstrap Next.js/TypeScript project | None | DONE |
| [WEB-002](WEB-002.md) | Establish minimal design tokens and visual foundation | WEB-001 | DONE |
| [WEB-003](WEB-003.md) | Typed API client and local backend proxy | WEB-001 | DONE |
| [WEB-004](WEB-004.md) | Responsive application shell | WEB-002 | DONE |
| [WEB-005](WEB-005.md) | Service-date train list and train detail | WEB-003, WEB-004 | DONE |
| [WEB-006](WEB-006.md) | *Merged into WEB-005* | — | MERGED |
| [WEB-007](WEB-007.md) | Movement and delay-state presentation | WEB-005 | DONE |
| [WEB-008](WEB-008.md) | MARC alerts experience | WEB-003, WEB-004 | DONE |
| [WEB-009](WEB-009.md) | MARC Pulse home experience | WEB-005, WEB-008 | DONE |
| [WEB-010](WEB-010.md) | Central polling and resilient freshness states | WEB-007, WEB-008, WEB-009 | DONE |
| [WEB-011](WEB-011.md) | Responsive accessibility and design review | WEB-010 | DONE |
| [WEB-012](WEB-012.md) | Local frontend/backend integration smoke test | WEB-011 | DONE |
| [WEB-013](WEB-013.md) | Reconcile trip-level and stop-level official status | WEB-005, WEB-007 | DONE |
| [WEB-014](WEB-014.md) | Show the operator's scheduled destination | WEB-005 | DONE — detail only |
| [WEB-015](WEB-015.md) | Verify the app against live MARC service | WEB-012 | NOT_STARTED |

WEB-013 through WEB-015 came out of running the app against the real backend rather than from
planning: WEB-013 from a contradiction visible only in live MDOT data, WEB-014 from an
endpoint the original contract review missed, and WEB-015 from the first live ingest proving
the synthetic movement fixtures can be replaced with observations.

Visual tickets require rendered review, not just passing tests. See [roadmap](../ROADMAP.md) and [current state](../CURRENT_STATE.md).

## Required map follow-on

The original core tickets remain unchanged in order. [Map plan](../MAP_PLAN.md) adds these follow-on tickets; WEB-MAP-1 is DONE and the rest are blocked.

| Ticket | Title | Dependencies | Status |
|---|---|---|---|
| [WEB-MAP-1](WEB-MAP-1.md) | Map technology and data contract | WEB-012 | DONE |
| [WEB-MAP-2](WEB-MAP-2.md) | Canonical MARC route rendering | WEB-MAP-1 + delivered BACKEND-UI-03 | **BLOCKED** — no geometry endpoint exists |
| [WEB-MAP-3](WEB-MAP-3.md) | Active train markers with position trust | WEB-MAP-2 + delivered BACKEND-UI-02 | **BLOCKED** — no active-membership endpoint exists |
| [WEB-MAP-4](WEB-MAP-4.md) | Train focus and observation-based follow | WEB-MAP-3 | **BLOCKED** via WEB-MAP-3 |
| [WEB-MAP-5](WEB-MAP-5.md) | Map and train-detail integration | WEB-MAP-4 | **BLOCKED** via WEB-MAP-4 |

Backend proposal delivery is a gate, not permission to modify the backend. Assessment can document gaps; map implementation cannot claim missing contracts are satisfied.
