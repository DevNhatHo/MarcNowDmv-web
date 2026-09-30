/**
 * SYNTHETIC fixtures — not observations.
 *
 * The planning captures contain no fresh MOVING or STATIONARY movement, no measured route
 * progress and no non-UNKNOWN delay trend, because the retained data is from a completed
 * service date. Those branches still need coverage, so these bodies are constructed by
 * hand on top of a real capture's shape. Every value below was invented for a test and
 * must never be described as backend behaviour, live service or observed movement.
 */
import { mutableBody } from "./captures";

function detailShell(): Record<string, unknown> {
  return mutableBody("train-detail");
}

/** SYNTHETIC: a fresh stationary train with measured progress and a worsening trend. */
export function syntheticActiveDetail(): Record<string, unknown> {
  const body = detailShell();
  body.calculated = {
    evaluatedAt: "2026-09-29T12:05:00Z",
    observedMovement: {
      provenance: "CALCULATED",
      state: "STATIONARY",
      reasons: [],
      observedStart: "2026-09-29T12:03:00Z",
      observedEnd: "2026-09-29T12:05:00Z",
      stationarySeconds: 120,
      maxDisplacementMeters: 8.5,
      observationIds: ["9007199254740993", "9007199254740994"],
      radiusMeters: 30,
      minStationarySeconds: 60,
      maxGapSeconds: 60,
      rejectedCount: 1,
    },
    routeProgress: {
      provenance: "CALCULATED",
      state: "MEASURED",
      reasons: [],
      shapeId: "shp-1",
      shapeLengthMeters: 64000,
      alongRouteMeters: 32000.5,
      fractionAlong: 0.5,
      offRouteMeters: 12.25,
      candidates: [
        {
          shapeSequence: 41,
          alongRouteMeters: 32000.5,
          offRouteMeters: 12.25,
          // SYNTHETIC: deliberately a mileage value over a line whose length is metres,
          // so a test can prove the two are never conflated.
          sourceShapeDistance: 19.884,
        },
      ],
      nearest: {
        shapeSequence: 41,
        alongRouteMeters: 32000.5,
        offRouteMeters: 12.25,
        sourceShapeDistance: 19.884,
      },
      corridorMeters: 150,
      separationMeters: 200,
      sourceDistanceUnits: "unknown",
    },
    nextStop: {
      provenance: "CALCULATED",
      state: "IDENTIFIED",
      reasons: [],
      stopSequence: 5,
      stopId: "11985",
      alongRouteDistanceMeters: 1420.75,
      units: "meters",
      officiallySkipped: false,
    },
    officialDelayTrend: {
      provenance: "CALCULATED",
      state: "WORSENING",
      reasons: [],
      level: "STOP",
      stopSequence: 5,
      event: "ARRIVAL",
      changeSeconds: 240,
      officialDelaySeconds: 420,
      observationIds: ["11", "12"],
      windowSeconds: 900,
      toleranceSeconds: 60,
      excludedCount: 0,
    },
  };
  return body;
}

/**
 * SYNTHETIC: a backend that has grown states this frontend has never seen. Parsing must
 * succeed and preserve them verbatim so presentation can fall back to a neutral unknown.
 */
export function syntheticUnknownEnums(): Record<string, unknown> {
  const body = detailShell();
  const data = body.data as Record<string, unknown>;
  data.status = "REROUTED";
  (data.official as Record<string, unknown>).freshness = "PARTIAL";
  (data.official as Record<string, unknown>).status = "HELD_AT_STATION";
  (data.position as Record<string, unknown>).freshness = "SUPERSEDED";
  const calculated = body.calculated as Record<string, unknown>;
  (calculated.observedMovement as Record<string, unknown>).state = "DRIFTING";
  (calculated.officialDelayTrend as Record<string, unknown>).level = "SEGMENT";
  (calculated.officialDelayTrend as Record<string, unknown>).event = "PASSING";
  const health = body.sourceHealth as Record<string, unknown>[];
  health[0].state = "RECOVERING";
  return body;
}

/**
 * SYNTHETIC: every nullable field null and every optional list absent, which is what a
 * schedule-only train with no realtime evidence looks like at its emptiest.
 */
export function syntheticEmptyDetail(): Record<string, unknown> {
  const body = detailShell();
  body.calculated = null;
  body.nextStop = null;
  body.nextUpdate = null;
  body.officialStopUpdates = [];
  const data = body.data as Record<string, unknown>;
  (data.scheduled as Record<string, unknown>).end = null;
  data.official = {
    source: "MARC_TRIP_UPDATES",
    observationId: null,
    sourceTimestamp: null,
    receivedAt: null,
    freshness: "UNAVAILABLE",
    conflict: false,
    provenance: "OFFICIAL_REALTIME",
    status: "UNKNOWN",
    delaySeconds: null,
    scheduleRelationship: null,
  };
  data.position = {
    source: "MARC_VEHICLE_POSITIONS",
    observationId: null,
    sourceTimestamp: null,
    receivedAt: null,
    freshness: "UNAVAILABLE",
    conflict: false,
    provenance: "OFFICIAL_REALTIME",
    latitude: null,
    longitude: null,
    speedMetersPerSecond: null,
    bearingDegrees: null,
    vehicleId: null,
  };
  // The backend sends `signals` from a possibly-nil slice, so null must parse as empty.
  (body.sourceHealth as Record<string, unknown>[])[0].signals = null;
  return body;
}

/** SYNTHETIC: an official update the backend could not match to a scheduled call. */
export function syntheticUnresolvedUpdate(): Record<string, unknown> {
  const body = detailShell();
  body.officialStopUpdates = [
    {
      ordinal: 0,
      resolvedSequence: null,
      stopId: null,
      scheduleRelationship: 1,
      officialEstimatedArrival: null,
      officialEstimatedDeparture: null,
      officialArrivalDelaySeconds: null,
      officialDepartureDelaySeconds: -30,
      resolution: "no_matching_stop",
    },
  ];
  return body;
}

/** SYNTHETIC: an alert with no text, no selectors and an open-ended active period. */
export function syntheticSparseAlertPage(): Record<string, unknown> {
  const body = mutableBody("alerts");
  body.data = [
    {
      id: "99001",
      observationId: "77",
      provenance: "OFFICIAL_REALTIME",
      cause: null,
      effect: null,
      headerText: null,
      descriptionText: null,
      url: null,
      informedEntity: [],
      activePeriods: [{ start: null, end: null }],
    },
  ];
  body.nextAfter = null;
  return body;
}

/** SYNTHETIC: a two-page train list, for a bounded continuation walk. */
export function syntheticTrainPage(
  version: string,
  nextAfter: string | null,
): Record<string, unknown> {
  const body = mutableBody("trains");
  (body.scheduleVersion as Record<string, unknown>).id = version;
  body.nextAfter = nextAfter;
  return body;
}

/**
 * SYNTHETIC: a calculated group in a chosen combination of states.
 *
 * The retained database produces only UNKNOWN calculations, so every fresh branch below is
 * invented for a test. None of it is an observation, and no screenshot of it may be
 * described as live service.
 */
export function syntheticCalculatedDetail(overrides: {
  movement?: Record<string, unknown>;
  nextStop?: Record<string, unknown>;
  trend?: Record<string, unknown>;
  progress?: Record<string, unknown>;
}): Record<string, unknown> {
  const body = syntheticActiveDetail();
  const calculated = body.calculated as Record<string, unknown>;
  calculated.observedMovement = {
    ...(calculated.observedMovement as Record<string, unknown>),
    ...(overrides.movement ?? {}),
  };
  calculated.nextStop = {
    ...(calculated.nextStop as Record<string, unknown>),
    ...(overrides.nextStop ?? {}),
  };
  calculated.officialDelayTrend = {
    ...(calculated.officialDelayTrend as Record<string, unknown>),
    ...(overrides.trend ?? {}),
  };
  calculated.routeProgress = {
    ...(calculated.routeProgress as Record<string, unknown>),
    ...(overrides.progress ?? {}),
  };
  return body;
}

/**
 * SYNTHETIC: tracking has been lost, but the dwell once observed is still carried on the
 * UNKNOWN movement. Presenting that value as a current duration is the specific mistake
 * this fixture exists to catch.
 */
export function syntheticLostTrackingWithHistoricDwell(): Record<string, unknown> {
  return syntheticCalculatedDetail({
    movement: {
      state: "UNKNOWN",
      reasons: ["source_stale"],
      stationarySeconds: 900,
      observedStart: "2026-09-29T11:40:00Z",
      observedEnd: "2026-09-29T11:55:00Z",
    },
  });
}

/**
 * SYNTHETIC: the GPS position is unusable while the operator's own delay evidence still
 * supports a trend. The two must be reported independently.
 */
export function syntheticStaleGpsWithLiveTrend(): Record<string, unknown> {
  const body = syntheticCalculatedDetail({
    movement: { state: "UNKNOWN", reasons: ["source_stale"], stationarySeconds: null },
    nextStop: { state: "UNKNOWN", reasons: ["progress_unknown"], stopId: null, stopSequence: null, alongRouteDistanceMeters: null, officiallySkipped: null },
    trend: { state: "IMPROVING", changeSeconds: -180, officialDelaySeconds: 240 },
  });
  const position = (body.data as Record<string, unknown>).position as Record<string, unknown>;
  position.freshness = "STALE";
  return body;
}
