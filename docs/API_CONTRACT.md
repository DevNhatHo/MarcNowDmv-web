# Verified backend contract

Inspected implementation at backend commit `ade2f9e` (MARC-505), including `internal/httpapi/trains.go`, `movement.go`, train read and movement summary code. Actual local HTTP captures are in [contract-samples](contract-samples/manifest.json), captured 2026-09-29 from `marc_208_live`. Existing retained official data was read; no feeds were ingested. These samples demonstrate shapes and stale/unknown behavior, **not current live service**. The wrappers contain method/path/status/headers/body; wire fixtures use the body.

## Endpoints

| Endpoint | Contract and limits |
|---|---|
| `/health` | Process/database availability only; not realtime-feed health. |
| `/api/v1/routes`, `/api/v1/stops` | Collections with `scheduleVersion`, SCHEDULED provenance, `data`, `nextAfter`. No individual route/stop endpoint. Route names and stop names come from these catalogs. |
| `/api/v1/trains` | `evaluatedAt`, scheduleVersion object, `serviceDate`, `sourceHealth`, `data`, `nextAfter`. Includes the whole scheduled service date, including completed and schedule-only trains. Not an active-train list. |
| `/api/v1/trains/{id}` | `evaluatedAt`, `data`, `sourceHealth`, `scheduledStops`, `officialStopUpdates`, `nextStop`, `nextUpdate`, **top-level `calculated`**. |
| `/api/v1/alerts` | `evaluatedAt`, snapshot token, scheduleVersion string, sourceTimestamp, sourceHealth, data, nextAfter. Backend filters MARC relevance and active periods. |

Train filters are `serviceDate=YYYYMMDD`, `routeId`, `limit`, `after`, `version`. Service date defaults to feed timezone, not browser timezone or UTC. Catalog/list limit defaults to 50, maximum 200; cursor continuation requires the appropriate version/snapshot token. Use returned tokens opaquely and URL-encode all values. On `409 schedule_changed` or snapshot mismatch, restart once without stale cursors. Load more must remain bounded and explicit; never report partial-page totals as complete.

Detail stop/update pagination uses **`afterStop` and `afterUpdate`**. `nextStop` and `nextUpdate` at envelope level are cursors, not commuter next-stop information. Do not conflate them with `calculated.nextStop`. Actual `?stopAfter=1` returned 400; `?afterStop=1` returned 200. Unsupported route detail returned 404; invalid limit returned 400. HEAD `/health` returned 200 with no body.

## Official train data

`data` carries opaque `id`, `scheduleVersion` string, `tripId`, `routeId`, `serviceDate`, `status`, `scheduled`, `official`, and `position`. `scheduled.start/end` are scheduled timestamps with SCHEDULED provenance. Train short name, headsign, and direction are **not exposed**. Use a verbatim trip-ID fallback; do not parse identifiers to invent a number or destination.

Official and position evidence carry source, nullable observationId/sourceTimestamp/receivedAt, freshness and conflict, and OFFICIAL_REALTIME provenance. `official` adds status, nullable delaySeconds and scheduleRelationship. `position` adds nullable latitude, longitude, speedMetersPerSecond, bearingDegrees, vehicleId. Zero delay differs from null delay. A retained `official.status` can say ON_TIME while evidence is stale: use the top-level status and freshness for current claims. Never promote historical evidence to current status.

Scheduled stops contain sequence, stopId, scheduledArrival/Departure. Official updates contain ordinal, resolvedSequence, stopId, scheduleRelationship, officialEstimatedArrival/Departure, officialArrival/DepartureDelaySeconds and resolution. Keep schedule and official estimates labeled separately; do not fabricate estimates from delay arithmetic. Original schedule-version identities survive schedule activation; active catalog names may not resolve old-version detail.

## Calculated detail

`calculated` is nullable and is a sibling of `data`. Each subobject is CALCULATED, with reasons; interpret subobjects independently.

| Object | Known states | Useful fields and presentation |
|---|---|---|
| observedMovement | MOVING, STATIONARY, UNKNOWN | observedStart/end, stationarySeconds, maxDisplacementMeters, observationIds, thresholds and rejectedCount. Only STATIONARY may show “Appears stationary” and backend duration. Never extend duration using wall time. |
| routeProgress | MEASURED, AMBIGUOUS, OFF_ROUTE, UNKNOWN | shapeId, shapeLengthMeters, alongRouteMeters, fractionAlong, offRouteMeters, candidates/nearest, corridor/separation thresholds. These are not route geometry. |
| nextStop | IDENTIFIED, PASSED_FINAL, UNKNOWN | stopSequence, stopId, alongRouteDistanceMeters, units, officiallySkipped. If skipped, say scheduled candidate reported skipped; do not advance it yourself. |
| officialDelayTrend | IMPROVING, STABLE, WORSENING, UNKNOWN | level, stopSequence, event, changeSeconds, officialDelaySeconds, observationIds, window/tolerance/excludedCount. Label “MARC Now · trend of official delays.” |

UNKNOWN movement can retain a historic stationarySeconds value. Do not display that as current stationary duration. Position freshness and movement are different: POSITION_STALE/POSITION_UNKNOWN are possible UI labels, **not backend movement enum values**. A stale retained coordinate is “Last reported location,” never proof of a stopped train. Do not claim proximity to a named station from raw coordinates. Delay trend uses independent official delay evidence; stale GPS alone must not erase a valid trend.

Train-list rows contain no calculated movement, next stop, or trend. Do not request detail for every row to fabricate summaries. No public shape/polyline endpoint exists. Map is planned after WEB-012 and gated on the proposed geometry endpoint; see [MAP_PLAN.md](MAP_PLAN.md).

## Alerts and source health

Alert text fields are nullable translation objects (`translation: [{text, language}]`), not strings. Prefer English then first nonempty translation. Render plain text, never injected HTML. Links permit only HTTP(S). Cause/effect are nullable numeric enums: use documented known labels, neutral fallback for unknown values; do not invent severity or inferred causes. Keep distinct alert IDs even when titles match.

`informedEntity` may specify agencyId, routeId, routeType, stopId, directionId, or a trip descriptor. Preserve selector scope; broad route/agency context is not a claim that a particular train is affected. Active-period bounds may be absent. The captured feed contains four MARC-relevant retained alerts; an empty result without usable feed/schedule is not proof that there are no agency disruptions.

Source-health states include HEALTHY, DEGRADED, STALE and UNAVAILABLE. A GTFS-RT 3.0 feed accepted with warning is usable but DEGRADED; stale retained alerts must show last-received time. Feed health is secondary to the commuter content and does not replace per-evidence freshness. Display no-alert success only with usable, sufficiently current evidence; otherwise explain unavailable or outdated alert information.

## Field types corrected during WEB-003 (backend untouched)

WEB-003 read the handler DTOs in `internal/httpapi/trains.go` and `catalog.go` rather than
relying on this document's prose, and found field types the planning captures could not
show because the sampled values happened to be present or integral. The implemented wire
types use the DTO definitions; the captures remain consistent with both readings.

| Field | Actual type | Why the capture did not show it |
|---|---|---|
| `official.scheduleRelationship`, `officialStopUpdates[].scheduleRelationship` | nullable **number** (GTFS-RT numeric enum), not a string | null in every sampled row |
| `officialStopUpdates[].stopId`, `.resolvedSequence` | **nullable** | the sampled updates all resolved |
| `nextStop`, `nextUpdate` (envelope cursors) | nullable **number** | null in every sample |
| `routes[].shortName`, `.longName`, `stops[].name`, `.wheelchairBoarding` | **nullable** | populated in the sampled catalog |
| `sourceHealth[].signals` | array that may arrive **null**, from a nil Go slice | non-nil in every sample |
| `informedEntity[].trip.scheduleRelationship` | serialized raw JSON; shape is not contracted | null in every sample |

Cursor requirements were also verified in the query parsers, not the prose:
`/api/v1/trains` with `after` requires **both** `serviceDate` and `version`, and rejects a
cursor whose embedded service date differs from `serviceDate`. `/api/v1/alerts` with
`after` requires **both** `snapshot` and `version`. Train **detail accepts no `version`
parameter** at all, only `limit`, `afterStop` and `afterUpdate`. The client refuses these
combinations locally so a request certain to be rejected is never sent.

## Documentation discrepancies (backend untouched)

- Backend API prose uses `stopAfter`/`updateAfter`; handler uses `afterStop`/`afterUpdate` (stop cursor verified by HTTP).
- Treat `calculated` as an envelope sibling, not a nested train field.
- Prose suggesting stale GPS forces delay trend UNKNOWN disagrees with independent trend evaluation in code.
- Prose suggesting no duration field conflicts with observedMovement.stationarySeconds.
- Prose suggesting a new poll reassigns retained identity after activation conflicts with preserved original schedule association.

Implementation and captures take precedence. See [proposed backend work](BACKEND_GAPS.md). Future wire tests must cover nulls, unknown enums, both cursor families, stale retained official ON_TIME, and distinct provenance. Fresh MOVING/STATIONARY and trend branches require clearly synthetic deterministic fixtures because planning did not capture fresh examples.
