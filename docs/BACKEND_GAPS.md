# Backend proposals (not implementation authorization)

These are frontend planning references, not allocated MARC ticket IDs. No backend files were changed.

| Proposal | Missing capability | Frontend fallback | Follow-up acceptance |
|---|---|---|---|
| BACKEND-UI-01 | Commuter train number/headsign/direction and version-correct display names | Show line from matching catalog, verbatim tripId otherwise; omit unsupported direction. Old detail uses IDs when catalog differs. | Backend exposes scheduled display metadata and original-version route/stop names without parsing opaque IDs. |
| BACKEND-UI-02 | Bounded current-running semantics and movement summaries for list/Pulse/system map | Label “Scheduled for this service date”; show reported status and unknown coverage. No active/stationary totals, no N+1 detail calls. | Define overnight/current-run inclusion, stale-candidate retention/expiry, unknown coverage and version-safe pagination; expose bounded identity/position/status summaries with independent provenance/freshness and optional movement summary. This active-membership contract gates WEB-MAP-3; no frontend inferred active window or N+1 detail reads. |
| BACKEND-UI-03 | Versioned route geometry for a useful map | Core detail retains textual coordinates; WEB-MAP-2 is gated on this API, while map planning proceeds. | Expose canonical ordered GTFS geometry, scheduleVersion/shape identity, exact trip-to-shape mapping, matching station metadata and bounded payload/pagination/error semantics, including retained old-version detail. Prefer GeoJSON longitude/latitude coordinates; distinguish missing geometry from empty active service. Add backend contract tests and samples before WEB-MAP-2. |
| BACKEND-UI-04 | API documentation differs from current handlers | Use verified contract/captures in this repository. | Correct cursor names, calculated envelope placement, independent trend freshness, duration field and identity activation semantics; add contract examples/tests. |
| BACKEND-UI-05 | Published field types and nullability are not documented | WEB-003 derived the wire types from the handler DTOs; the corrections are tabulated in API_CONTRACT.md. | Document `scheduleRelationship` as a nullable numeric enum, mark `officialStopUpdates[].stopId`/`.resolvedSequence`, the envelope `nextStop`/`nextUpdate` cursors, catalog `shortName`/`longName`/`name`/`wheelchairBoarding` nullable, guarantee `sourceHealth[].signals` is always an array rather than a nil slice, and state the cursor prerequisites (`serviceDate`+`version` for trains, `snapshot`+`version` for alerts, no `version` on detail). |

## Delivered by the backend, 2026-09-30 — both map gates are now satisfied

Verified live after backend commits `8a1bca5`, `744fb32` and `4c01a6f`:

| Proposal | Status |
|---|---|
| BACKEND-UI-03 geometry | **DELIVERED.** `GET /api/v1/shapes` returns RFC 7946 LineStrings in the catalog envelope, `provenance: SCHEDULED`, addressed by `shapeId` and filterable by `routeId`. Confirmed: `shapeId 116473`, 485 points, `LineString`. |
| BACKEND-UI-02 active membership | **DELIVERED as three facts, not one.** Every train carries `membership` with `scheduledActive`, `realtimeObserved` and `positionFresh`. There is deliberately no `active` boolean. |
| BACKEND-UI-01 destination | **DELIVERED on the list.** `scheduled` now carries `shapeId`, `directionId` and `headsign` — confirmed live as `shapeId 116595`, `headsign "BALTIMORE CAMDEN"`. This closes the part WEB-014 could not reach, which needed a stop to anchor the stop-scoped departures read. |

Two consequences for this repository. `/api/v1/shapes` is **refused by our own proxy
allowlist** until a ticket adds it, which is the allowlist behaving correctly. And
`membership` must be read as three independent facts: collapsing them in the client would
reintroduce exactly what the backend refused to do, and live data shows them disagreeing — a
train with `positionFresh: true` and `scheduledActive: false` is running late, not absent.

## WEB-MAP-1 verification against the running backend (2026-09-30)

Probed live, against backend commit `fdd6d4b` on the retained database:

| Proposal | Status after verification |
|---|---|
| BACKEND-UI-01 | **Sharpened by WEB-014.** Detail now shows the operator's headsign, anchored on the train's own first stop. The **list** still cannot: its response carries no stops, so there is no anchor and no way to find one without a per-train detail read. One probe shows the data is cheap — a single departures read at stop 11958 returns 91 trips across all three routes with `nextAfter: null`. Either carry `headsign` on the train list and detail responses, or expose each line's terminal so one anchored read covers it. | — |
| BACKEND-UI-01 (original note) | **Partly available, and previously overstated.** `/api/v1/departures` exposes a scheduled `headsign` per trip at a stop. It is absent from the train list and detail, so those screens still fall back to `tripId`, but a destination does exist in the contract. The remaining gap is a display name on the list and detail responses. |
| BACKEND-UI-02 | **Undelivered.** No active-membership endpoint exists; `/api/v1/trains/active` returns 404. The train list remains a whole scheduled service date with no current-running semantics. |
| BACKEND-UI-03 | **Undelivered.** No geometry endpoint exists; `/api/v1/shapes`, `/api/v1/geometry` and `/api/v1/routes/geometry` all return 404. Shape identity reaches the frontend only as `calculated.routeProgress.shapeId`, with no coordinates. |
| BACKEND-UI-04 | **Confirmed live.** On the same real identifier, `?stopAfter=1` returns 400 and `?afterStop=1` returns 200. |
| BACKEND-UI-05 | Unchanged; the field-type corrections stand. |

The full backend route table is `/health`, `/api/v1/routes`, `/api/v1/stops`,
`/api/v1/trains`, `/api/v1/trains/{id}`, `/api/v1/alerts` and `/api/v1/departures`. No other
path exists, so WEB-MAP-2 and WEB-MAP-3 cannot be started.

CORS headers were absent on inspected browser-Origin requests. The frontend same-origin proxy resolves local integration; no backend CORS change is required for this plan. Product polish is constrained by missing names, but the local milestone is not blocked. Never mask these gaps with fabricated operational statements.

Map is required roadmap work now; see [MAP_PLAN.md](MAP_PLAN.md). BACKEND-UI-01 improves identity/destination labels but remains nonblocking with explicit missing-data fallbacks. A reported nullable bearing can orient the marker without inventing a destination. BACKEND-UI-02 and BACKEND-UI-03 are hard gates for their map implementation scopes, not blockers to the original core or this documentation update.
