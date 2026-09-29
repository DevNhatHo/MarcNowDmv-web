# Backend proposals (not implementation authorization)

These are frontend planning references, not allocated MARC ticket IDs. No backend files were changed.

| Proposal | Missing capability | Frontend fallback | Follow-up acceptance |
|---|---|---|---|
| BACKEND-UI-01 | Commuter train number/headsign/direction and version-correct display names | Show line from matching catalog, verbatim tripId otherwise; omit unsupported direction. Old detail uses IDs when catalog differs. | Backend exposes scheduled display metadata and original-version route/stop names without parsing opaque IDs. |
| BACKEND-UI-02 | Bounded current-running semantics and movement summaries for list/Pulse | Label “Scheduled for this service date”; show reported status and unknown coverage. No active/stationary totals, no N+1 detail calls. | Define overnight/current-run inclusion and unknown coverage; expose bounded summaries with independent provenance/freshness. |
| BACKEND-UI-03 | Versioned route geometry for a useful map | Textual current/last coordinates and next scheduled candidate; defer map beyond core milestone. | Stable geometry/version contract, size bounds and stale-marker semantics; only then create optional frontend map ticket. |
| BACKEND-UI-04 | API documentation differs from current handlers | Use verified contract/captures in this repository. | Correct cursor names, calculated envelope placement, independent trend freshness, duration field and identity activation semantics; add contract examples/tests. |

CORS headers were absent on inspected browser-Origin requests. The frontend same-origin proxy resolves local integration; no backend CORS change is required for this plan. Product polish is constrained by missing names, but the local milestone is not blocked. Never mask these gaps with fabricated operational statements.
