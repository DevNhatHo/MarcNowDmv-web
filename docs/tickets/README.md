# Frontend ticket index

**The core local milestone is complete**: WEB-001 through WEB-012 are DONE (WEB-006 was merged into WEB-005), and WEB-013 through WEB-015 followed from findings made by running the app against the real backend. [WEB-MAP-1](WEB-MAP-1.md), [WEB-MAP-2](WEB-MAP-2.md), [WEB-MAP-6](WEB-MAP-6.md), [WEB-MAP-3](WEB-MAP-3.md), [WEB-MAP-4](WEB-MAP-4.md) and [WEB-MAP-7](WEB-MAP-7.md) are DONE. **The backend delivered both map gates on 2026-09-30** — see [backend proposals](../BACKEND_GAPS.md) — so WEB-MAP-3 through WEB-MAP-5 are unblocked, and a [live movement addendum](../MAP_PLAN.md) on 2026-10-02 added WEB-MAP-7. The renderer is now MapLibre GL JS, so the marker work is written once. **The map milestone is complete**: WEB-MAP-1 through WEB-MAP-7 are all DONE. No ticket is open. Remaining work is recorded as [backend proposals](../BACKEND_GAPS.md), not as frontend tickets. Resume IN_PROGRESS work before choosing a new ticket. Work is committed here and pushed to `origin/main`.

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
| [WEB-015](WEB-015.md) | Verify the app against live MARC service | WEB-012 | DONE — evening service, not a peak |

WEB-013 through WEB-015 came out of running the app against the real backend rather than from
planning: WEB-013 from a contradiction visible only in live MDOT data, WEB-014 from an
endpoint the original contract review missed, and WEB-015 from the first live ingest proving
the synthetic movement fixtures can be replaced with observations.

Visual tickets require rendered review, not just passing tests. See [roadmap](../ROADMAP.md) and [current state](../CURRENT_STATE.md).

## Required map follow-on

Map order is WEB-MAP-1 → WEB-MAP-2 → **WEB-MAP-6** → WEB-MAP-3 → WEB-MAP-4 → **WEB-MAP-7** → WEB-MAP-5. WEB-MAP-6 and WEB-MAP-7 carry later numbers because the tickets before them are DONE or already written, and renumbering would break the record of what shipped. WEB-MAP-7 runs before WEB-MAP-5 so the integration review judges the finished behaviour. The original core tickets remain unchanged in order. [Map plan](../MAP_PLAN.md) carries the renderer ADR and the layer, freshness and accessibility rules.

| Ticket | Title | Dependencies | Status |
|---|---|---|---|
| [WEB-MAP-1](WEB-MAP-1.md) | Map technology and data contract | WEB-012 | DONE |
| [WEB-MAP-2](WEB-MAP-2.md) | Canonical MARC route rendering | WEB-MAP-1 + BACKEND-UI-03 (delivered) | DONE — stations owed to WEB-MAP-3 |
| [WEB-MAP-6](WEB-MAP-6.md) | **Adopt MapLibre GL JS** — ran before WEB-MAP-3 | WEB-MAP-2 | DONE |
| [WEB-MAP-3](WEB-MAP-3.md) | Active train markers with position trust | WEB-MAP-6 (done) + BACKEND-UI-02 (delivered) | DONE |
| [WEB-MAP-4](WEB-MAP-4.md) | Train focus and observation-based follow | WEB-MAP-3 (done) | DONE |
| [WEB-MAP-7](WEB-MAP-7.md) | **Smooth transitions between observed positions** — ran after WEB-MAP-4, before WEB-MAP-5 | WEB-MAP-4 (done) | DONE |
| [WEB-MAP-5](WEB-MAP-5.md) | Map and train-detail integration | WEB-MAP-7 (done) | DONE |

Backend proposal delivery is a gate, not permission to modify the backend. BACKEND-UI-02 and BACKEND-UI-03 were **delivered on 2026-09-30** and verified live; see [backend proposals](../BACKEND_GAPS.md).
