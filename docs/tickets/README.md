# Frontend ticket index

Planning complete; no implementation ticket started or completed. Recommended next: [WEB-001](WEB-001.md). Resume IN_PROGRESS work before choosing a new ticket. All work remains local.

| Ticket | Title | Dependencies | Status |
|---|---|---|---|
| [WEB-001](WEB-001.md) | Bootstrap Next.js/TypeScript project | None | NOT_STARTED |
| [WEB-002](WEB-002.md) | Establish minimal design tokens and visual foundation | WEB-001 | NOT_STARTED |
| [WEB-003](WEB-003.md) | Typed API client and local backend proxy | WEB-001 | NOT_STARTED |
| [WEB-004](WEB-004.md) | Responsive application shell | WEB-002 | NOT_STARTED |
| [WEB-005](WEB-005.md) | Service-date train list | WEB-003, WEB-004 | NOT_STARTED |
| [WEB-006](WEB-006.md) | Train detail with official and scheduled information | WEB-005 | NOT_STARTED |
| [WEB-007](WEB-007.md) | Movement and delay-state presentation | WEB-006 | NOT_STARTED |
| [WEB-008](WEB-008.md) | MARC alerts experience | WEB-003, WEB-004 | NOT_STARTED |
| [WEB-009](WEB-009.md) | MARC Pulse home experience | WEB-005, WEB-008 | NOT_STARTED |
| [WEB-010](WEB-010.md) | Central polling and resilient freshness states | WEB-007, WEB-008, WEB-009 | NOT_STARTED |
| [WEB-011](WEB-011.md) | Responsive accessibility and design review | WEB-010 | NOT_STARTED |
| [WEB-012](WEB-012.md) | Local frontend/backend integration smoke test | WEB-011 | NOT_STARTED |

Visual tickets require rendered review, not just passing tests. See [roadmap](../ROADMAP.md) and [current state](../CURRENT_STATE.md).

## Required map follow-on

The original core tickets remain unchanged in order. [Map plan](../MAP_PLAN.md) adds these follow-on tickets; all remain NOT_STARTED.

| Ticket | Title | Dependencies | Status |
|---|---|---|---|
| [WEB-MAP-1](WEB-MAP-1.md) | Map technology and data contract | WEB-012 | NOT_STARTED |
| [WEB-MAP-2](WEB-MAP-2.md) | Canonical MARC route rendering | WEB-MAP-1 + delivered BACKEND-UI-03 | NOT_STARTED |
| [WEB-MAP-3](WEB-MAP-3.md) | Active train markers with position trust | WEB-MAP-2 + delivered BACKEND-UI-02 | NOT_STARTED |
| [WEB-MAP-4](WEB-MAP-4.md) | Train focus and observation-based follow | WEB-MAP-3 | NOT_STARTED |
| [WEB-MAP-5](WEB-MAP-5.md) | Map and train-detail integration | WEB-MAP-4 | NOT_STARTED |

Backend proposal delivery is a gate, not permission to modify the backend. Assessment can document gaps; map implementation cannot claim missing contracts are satisfied.
