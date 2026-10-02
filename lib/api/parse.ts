/**
 * Response parsers.
 *
 * One parser per verified response, each returning the wire type unchanged: timestamps
 * stay ISO strings, identifiers stay strings, nulls stay null, and provenance groups stay
 * separate. No parser derives, merges or defaults a value the backend did not send, so a
 * missing official delay can never become a zero and stale evidence can never become a
 * current claim.
 */
import type {
  HealthReport,
  ScheduleVersion,
  SourceHealth,
  WireError,
} from "../types/common";
import type {
  Alert,
  AlertPage,
  AlertSelector,
  AlertTripSelector,
  ActivePeriod,
  Translated,
  Translation,
} from "../types/alerts";
import type { CatalogPage, Route, Stop } from "../types/catalogs";
import type { Departure, DeparturePage } from "../types/departures";
import type { LineStringGeometry, Position, Shape, ShapePage } from "../types/geometry";
import type {
  Calculated,
  CalculatedNextStop,
  Evidence,
  ObservedMovement,
  OfficialDelayTrend,
  OfficialStopUpdate,
  OfficialTrain,
  ProgressCandidate,
  RouteProgress,
  ScheduledStop,
  ScheduledTrain,
  TrainMembership,
  Train,
  TrainDetail,
  TrainListPage,
  TrainPosition,
} from "../types/trains";
import { BackendError } from "./errors";
import {
  enumText,
  flag,
  list,
  nullableEnumText,
  nullableFlag,
  nullableNested,
  nullableNumeric,
  nullableText,
  numeric,
  object,
  optionalList,
  text,
} from "./contract";

function ids(value: unknown, path: string): string[] {
  return optionalList(value, path, text);
}

function reasons(value: unknown, path: string): string[] {
  return optionalList(value, path, enumText);
}

export function parseScheduleVersion(
  value: unknown,
  path: string,
): ScheduleVersion {
  const raw = object(value, path);
  return {
    id: text(raw.id, `${path}.id`),
    checksum: text(raw.checksum, `${path}.checksum`),
    timezone: text(raw.timezone, `${path}.timezone`),
    activatedAt: text(raw.activatedAt, `${path}.activatedAt`),
  };
}

export function parseSourceHealth(value: unknown, path: string): SourceHealth {
  const raw = object(value, path);
  return {
    source: enumText(raw.source, `${path}.source`),
    state: enumText(raw.state, `${path}.state`),
    signals: optionalList(raw.signals, `${path}.signals`, text),
    sourceTimestamp: nullableText(raw.sourceTimestamp, `${path}.sourceTimestamp`),
    receivedAt: nullableText(raw.receivedAt, `${path}.receivedAt`),
    lastFetch: nullableText(raw.lastFetch, `${path}.lastFetch`),
    lastSuccess: nullableText(raw.lastSuccess, `${path}.lastSuccess`),
    failureStreak: numeric(raw.failureStreak, `${path}.failureStreak`),
    httpStatus: nullableNumeric(raw.httpStatus, `${path}.httpStatus`),
    entityCount: nullableNumeric(raw.entityCount, `${path}.entityCount`),
    invalidCount: numeric(raw.invalidCount, `${path}.invalidCount`),
    feedVersion: nullableText(raw.feedVersion, `${path}.feedVersion`),
    compatibility: nullableEnumText(raw.compatibility, `${path}.compatibility`),
  };
}

function healthList(value: unknown, path: string): SourceHealth[] {
  return optionalList(value, path, parseSourceHealth);
}

export function parseHealth(value: unknown, path = "health"): HealthReport {
  const raw = object(value, path);
  const checks = object(raw.checks, `${path}.checks`);
  const parsed: Record<string, string> = {};
  for (const [name, state] of Object.entries(checks)) {
    parsed[name] = enumText(state, `${path}.checks.${name}`);
  }
  return { status: enumText(raw.status, `${path}.status`), checks: parsed };
}

export function parseWireError(value: unknown, path = "error"): WireError {
  const envelope = object(value, path);
  const raw = object(envelope.error, `${path}.error`);
  return {
    code: enumText(raw.code, `${path}.error.code`),
    message: text(raw.message, `${path}.error.message`),
  };
}

function parseEvidence(raw: Record<string, unknown>, path: string): Evidence {
  return {
    source: enumText(raw.source, `${path}.source`),
    observationId: nullableText(raw.observationId, `${path}.observationId`),
    sourceTimestamp: nullableText(raw.sourceTimestamp, `${path}.sourceTimestamp`),
    receivedAt: nullableText(raw.receivedAt, `${path}.receivedAt`),
    freshness: enumText(raw.freshness, `${path}.freshness`),
    conflict: flag(raw.conflict, `${path}.conflict`),
    provenance: enumText(raw.provenance, `${path}.provenance`),
  };
}

function parseScheduledTrain(value: unknown, path: string): ScheduledTrain {
  const raw = object(value, path);
  return {
    provenance: enumText(raw.provenance, `${path}.provenance`),
    start: text(raw.start, `${path}.start`),
    end: nullableText(raw.end, `${path}.end`),
    shapeId: nullableText(raw.shapeId, `${path}.shapeId`),
    directionId: nullableNumeric(raw.directionId, `${path}.directionId`),
    headsign: nullableText(raw.headsign, `${path}.headsign`),
  };
}

/**
 * Three booleans, each required. They are read separately and never combined here: the
 * presentation layer decides what to draw, and no caller may be handed one collapsed flag.
 */
function parseMembership(value: unknown, path: string): TrainMembership {
  const raw = object(value, path);
  return {
    scheduledActive: flag(raw.scheduledActive, `${path}.scheduledActive`),
    realtimeObserved: flag(raw.realtimeObserved, `${path}.realtimeObserved`),
    positionFresh: flag(raw.positionFresh, `${path}.positionFresh`),
  };
}

function parseOfficialTrain(value: unknown, path: string): OfficialTrain {
  const raw = object(value, path);
  return {
    ...parseEvidence(raw, path),
    status: enumText(raw.status, `${path}.status`),
    delaySeconds: nullableNumeric(raw.delaySeconds, `${path}.delaySeconds`),
    scheduleRelationship: nullableNumeric(
      raw.scheduleRelationship,
      `${path}.scheduleRelationship`,
    ),
  };
}

function parsePosition(value: unknown, path: string): TrainPosition {
  const raw = object(value, path);
  return {
    ...parseEvidence(raw, path),
    latitude: nullableNumeric(raw.latitude, `${path}.latitude`),
    longitude: nullableNumeric(raw.longitude, `${path}.longitude`),
    speedMetersPerSecond: nullableNumeric(
      raw.speedMetersPerSecond,
      `${path}.speedMetersPerSecond`,
    ),
    bearingDegrees: nullableNumeric(raw.bearingDegrees, `${path}.bearingDegrees`),
    vehicleId: nullableText(raw.vehicleId, `${path}.vehicleId`),
  };
}

export function parseTrain(value: unknown, path: string): Train {
  const raw = object(value, path);
  return {
    id: text(raw.id, `${path}.id`),
    scheduleVersion: text(raw.scheduleVersion, `${path}.scheduleVersion`),
    tripId: text(raw.tripId, `${path}.tripId`),
    routeId: text(raw.routeId, `${path}.routeId`),
    serviceDate: text(raw.serviceDate, `${path}.serviceDate`),
    status: enumText(raw.status, `${path}.status`),
    scheduled: parseScheduledTrain(raw.scheduled, `${path}.scheduled`),
    official: parseOfficialTrain(raw.official, `${path}.official`),
    position: parsePosition(raw.position, `${path}.position`),
    membership: parseMembership(raw.membership, `${path}.membership`),
  };
}

export function parseTrainListPage(
  value: unknown,
  path = "trains",
): TrainListPage {
  const raw = object(value, path);
  return {
    evaluatedAt: text(raw.evaluatedAt, `${path}.evaluatedAt`),
    scheduleVersion: parseScheduleVersion(
      raw.scheduleVersion,
      `${path}.scheduleVersion`,
    ),
    serviceDate: text(raw.serviceDate, `${path}.serviceDate`),
    sourceHealth: healthList(raw.sourceHealth, `${path}.sourceHealth`),
    data: list(raw.data, `${path}.data`, parseTrain),
    nextAfter: nullableText(raw.nextAfter, `${path}.nextAfter`),
  };
}

function parseScheduledStop(value: unknown, path: string): ScheduledStop {
  const raw = object(value, path);
  return {
    sequence: numeric(raw.sequence, `${path}.sequence`),
    stopId: text(raw.stopId, `${path}.stopId`),
    scheduledArrival: nullableText(raw.scheduledArrival, `${path}.scheduledArrival`),
    scheduledDeparture: nullableText(
      raw.scheduledDeparture,
      `${path}.scheduledDeparture`,
    ),
  };
}

function parseOfficialStopUpdate(
  value: unknown,
  path: string,
): OfficialStopUpdate {
  const raw = object(value, path);
  return {
    ordinal: numeric(raw.ordinal, `${path}.ordinal`),
    resolvedSequence: nullableNumeric(
      raw.resolvedSequence,
      `${path}.resolvedSequence`,
    ),
    stopId: nullableText(raw.stopId, `${path}.stopId`),
    scheduleRelationship: nullableNumeric(
      raw.scheduleRelationship,
      `${path}.scheduleRelationship`,
    ),
    officialEstimatedArrival: nullableText(
      raw.officialEstimatedArrival,
      `${path}.officialEstimatedArrival`,
    ),
    officialEstimatedDeparture: nullableText(
      raw.officialEstimatedDeparture,
      `${path}.officialEstimatedDeparture`,
    ),
    officialArrivalDelaySeconds: nullableNumeric(
      raw.officialArrivalDelaySeconds,
      `${path}.officialArrivalDelaySeconds`,
    ),
    officialDepartureDelaySeconds: nullableNumeric(
      raw.officialDepartureDelaySeconds,
      `${path}.officialDepartureDelaySeconds`,
    ),
    resolution: enumText(raw.resolution, `${path}.resolution`),
  };
}

function parseObservedMovement(value: unknown, path: string): ObservedMovement {
  const raw = object(value, path);
  return {
    provenance: enumText(raw.provenance, `${path}.provenance`),
    state: enumText(raw.state, `${path}.state`),
    reasons: reasons(raw.reasons, `${path}.reasons`),
    observedStart: nullableText(raw.observedStart, `${path}.observedStart`),
    observedEnd: nullableText(raw.observedEnd, `${path}.observedEnd`),
    stationarySeconds: nullableNumeric(
      raw.stationarySeconds,
      `${path}.stationarySeconds`,
    ),
    maxDisplacementMeters: nullableNumeric(
      raw.maxDisplacementMeters,
      `${path}.maxDisplacementMeters`,
    ),
    observationIds: ids(raw.observationIds, `${path}.observationIds`),
    radiusMeters: numeric(raw.radiusMeters, `${path}.radiusMeters`),
    minStationarySeconds: numeric(
      raw.minStationarySeconds,
      `${path}.minStationarySeconds`,
    ),
    maxGapSeconds: numeric(raw.maxGapSeconds, `${path}.maxGapSeconds`),
    rejectedCount: numeric(raw.rejectedCount, `${path}.rejectedCount`),
  };
}

function parseCandidate(value: unknown, path: string): ProgressCandidate {
  const raw = object(value, path);
  return {
    shapeSequence: numeric(raw.shapeSequence, `${path}.shapeSequence`),
    alongRouteMeters: numeric(raw.alongRouteMeters, `${path}.alongRouteMeters`),
    offRouteMeters: numeric(raw.offRouteMeters, `${path}.offRouteMeters`),
    sourceShapeDistance: nullableNumeric(
      raw.sourceShapeDistance,
      `${path}.sourceShapeDistance`,
    ),
  };
}

function parseRouteProgress(value: unknown, path: string): RouteProgress {
  const raw = object(value, path);
  return {
    provenance: enumText(raw.provenance, `${path}.provenance`),
    state: enumText(raw.state, `${path}.state`),
    reasons: reasons(raw.reasons, `${path}.reasons`),
    shapeId: nullableText(raw.shapeId, `${path}.shapeId`),
    shapeLengthMeters: nullableNumeric(
      raw.shapeLengthMeters,
      `${path}.shapeLengthMeters`,
    ),
    alongRouteMeters: nullableNumeric(
      raw.alongRouteMeters,
      `${path}.alongRouteMeters`,
    ),
    fractionAlong: nullableNumeric(raw.fractionAlong, `${path}.fractionAlong`),
    offRouteMeters: nullableNumeric(raw.offRouteMeters, `${path}.offRouteMeters`),
    candidates: optionalList(raw.candidates, `${path}.candidates`, parseCandidate),
    nearest: nullableNested(raw.nearest, `${path}.nearest`, parseCandidate),
    corridorMeters: numeric(raw.corridorMeters, `${path}.corridorMeters`),
    separationMeters: numeric(raw.separationMeters, `${path}.separationMeters`),
    sourceDistanceUnits: enumText(
      raw.sourceDistanceUnits,
      `${path}.sourceDistanceUnits`,
    ),
  };
}

function parseCalculatedNextStop(
  value: unknown,
  path: string,
): CalculatedNextStop {
  const raw = object(value, path);
  return {
    provenance: enumText(raw.provenance, `${path}.provenance`),
    state: enumText(raw.state, `${path}.state`),
    reasons: reasons(raw.reasons, `${path}.reasons`),
    stopSequence: nullableNumeric(raw.stopSequence, `${path}.stopSequence`),
    stopId: nullableText(raw.stopId, `${path}.stopId`),
    alongRouteDistanceMeters: nullableNumeric(
      raw.alongRouteDistanceMeters,
      `${path}.alongRouteDistanceMeters`,
    ),
    units: enumText(raw.units, `${path}.units`),
    officiallySkipped: nullableFlag(
      raw.officiallySkipped,
      `${path}.officiallySkipped`,
    ),
  };
}

function parseDelayTrend(value: unknown, path: string): OfficialDelayTrend {
  const raw = object(value, path);
  return {
    provenance: enumText(raw.provenance, `${path}.provenance`),
    state: enumText(raw.state, `${path}.state`),
    reasons: reasons(raw.reasons, `${path}.reasons`),
    level: enumText(raw.level, `${path}.level`),
    stopSequence: nullableNumeric(raw.stopSequence, `${path}.stopSequence`),
    event: nullableEnumText(raw.event, `${path}.event`),
    changeSeconds: nullableNumeric(raw.changeSeconds, `${path}.changeSeconds`),
    officialDelaySeconds: nullableNumeric(
      raw.officialDelaySeconds,
      `${path}.officialDelaySeconds`,
    ),
    observationIds: ids(raw.observationIds, `${path}.observationIds`),
    windowSeconds: numeric(raw.windowSeconds, `${path}.windowSeconds`),
    toleranceSeconds: numeric(raw.toleranceSeconds, `${path}.toleranceSeconds`),
    excludedCount: numeric(raw.excludedCount, `${path}.excludedCount`),
  };
}

function parseCalculated(value: unknown, path: string): Calculated {
  const raw = object(value, path);
  return {
    evaluatedAt: text(raw.evaluatedAt, `${path}.evaluatedAt`),
    observedMovement: parseObservedMovement(
      raw.observedMovement,
      `${path}.observedMovement`,
    ),
    routeProgress: parseRouteProgress(raw.routeProgress, `${path}.routeProgress`),
    nextStop: parseCalculatedNextStop(raw.nextStop, `${path}.nextStop`),
    officialDelayTrend: parseDelayTrend(
      raw.officialDelayTrend,
      `${path}.officialDelayTrend`,
    ),
  };
}

export function parseTrainDetail(value: unknown, path = "detail"): TrainDetail {
  const raw = object(value, path);
  return {
    evaluatedAt: text(raw.evaluatedAt, `${path}.evaluatedAt`),
    data: parseTrain(raw.data, `${path}.data`),
    sourceHealth: healthList(raw.sourceHealth, `${path}.sourceHealth`),
    scheduledStops: list(
      raw.scheduledStops,
      `${path}.scheduledStops`,
      parseScheduledStop,
    ),
    officialStopUpdates: list(
      raw.officialStopUpdates,
      `${path}.officialStopUpdates`,
      parseOfficialStopUpdate,
    ),
    nextStop: nullableNumeric(raw.nextStop, `${path}.nextStop`),
    nextUpdate: nullableNumeric(raw.nextUpdate, `${path}.nextUpdate`),
    calculated: nullableNested(raw.calculated, `${path}.calculated`, parseCalculated),
  };
}

function parseTranslation(value: unknown, path: string): Translation {
  const raw = object(value, path);
  return {
    text: text(raw.text, `${path}.text`),
    language: nullableText(raw.language, `${path}.language`),
  };
}

function parseTranslated(value: unknown, path: string): Translated {
  const raw = object(value, path);
  return {
    translation: optionalList(
      raw.translation,
      `${path}.translation`,
      parseTranslation,
    ),
  };
}

function parseTripSelector(value: unknown, path: string): AlertTripSelector {
  const raw = object(value, path);
  return {
    tripId: nullableText(raw.tripId, `${path}.tripId`),
    routeId: nullableText(raw.routeId, `${path}.routeId`),
    startDate: nullableText(raw.startDate, `${path}.startDate`),
    startTime: nullableText(raw.startTime, `${path}.startTime`),
    directionId: nullableNumeric(raw.directionId, `${path}.directionId`),
    scheduleRelationship: raw.scheduleRelationship ?? null,
  };
}

function parseSelector(value: unknown, path: string): AlertSelector {
  const raw = object(value, path);
  return {
    agencyId: nullableText(raw.agencyId, `${path}.agencyId`),
    routeId: nullableText(raw.routeId, `${path}.routeId`),
    routeType: nullableNumeric(raw.routeType, `${path}.routeType`),
    stopId: nullableText(raw.stopId, `${path}.stopId`),
    directionId: nullableNumeric(raw.directionId, `${path}.directionId`),
    trip: nullableNested(raw.trip, `${path}.trip`, parseTripSelector),
  };
}

function parseActivePeriod(value: unknown, path: string): ActivePeriod {
  const raw = object(value, path);
  return {
    start: nullableText(raw.start, `${path}.start`),
    end: nullableText(raw.end, `${path}.end`),
  };
}

export function parseAlert(value: unknown, path: string): Alert {
  const raw = object(value, path);
  return {
    id: text(raw.id, `${path}.id`),
    observationId: text(raw.observationId, `${path}.observationId`),
    provenance: enumText(raw.provenance, `${path}.provenance`),
    cause: nullableNumeric(raw.cause, `${path}.cause`),
    effect: nullableNumeric(raw.effect, `${path}.effect`),
    headerText: nullableNested(raw.headerText, `${path}.headerText`, parseTranslated),
    descriptionText: nullableNested(
      raw.descriptionText,
      `${path}.descriptionText`,
      parseTranslated,
    ),
    url: nullableNested(raw.url, `${path}.url`, parseTranslated),
    informedEntity: optionalList(
      raw.informedEntity,
      `${path}.informedEntity`,
      parseSelector,
    ),
    activePeriods: optionalList(
      raw.activePeriods,
      `${path}.activePeriods`,
      parseActivePeriod,
    ),
  };
}

export function parseAlertPage(value: unknown, path = "alerts"): AlertPage {
  const raw = object(value, path);
  return {
    evaluatedAt: text(raw.evaluatedAt, `${path}.evaluatedAt`),
    snapshot: text(raw.snapshot, `${path}.snapshot`),
    scheduleVersion: text(raw.scheduleVersion, `${path}.scheduleVersion`),
    sourceTimestamp: nullableText(raw.sourceTimestamp, `${path}.sourceTimestamp`),
    sourceHealth: healthList(raw.sourceHealth, `${path}.sourceHealth`),
    data: list(raw.data, `${path}.data`, parseAlert),
    nextAfter: nullableText(raw.nextAfter, `${path}.nextAfter`),
  };
}

function parseCatalogPage<T>(
  value: unknown,
  path: string,
  item: (value: unknown, path: string) => T,
): CatalogPage<T> {
  const raw = object(value, path);
  return {
    scheduleVersion: parseScheduleVersion(
      raw.scheduleVersion,
      `${path}.scheduleVersion`,
    ),
    provenance: enumText(raw.provenance, `${path}.provenance`),
    data: list(raw.data, `${path}.data`, item),
    nextAfter: nullableText(raw.nextAfter, `${path}.nextAfter`),
  };
}

function parseRoute(value: unknown, path: string): Route {
  const raw = object(value, path);
  return {
    id: text(raw.id, `${path}.id`),
    agencyId: text(raw.agencyId, `${path}.agencyId`),
    shortName: nullableText(raw.shortName, `${path}.shortName`),
    longName: nullableText(raw.longName, `${path}.longName`),
    description: nullableText(raw.description, `${path}.description`),
    routeType: numeric(raw.routeType, `${path}.routeType`),
    url: nullableText(raw.url, `${path}.url`),
    color: nullableText(raw.color, `${path}.color`),
    textColor: nullableText(raw.textColor, `${path}.textColor`),
    sortOrder: nullableNumeric(raw.sortOrder, `${path}.sortOrder`),
  };
}

function parseStop(value: unknown, path: string): Stop {
  const raw = object(value, path);
  return {
    id: text(raw.id, `${path}.id`),
    code: nullableText(raw.code, `${path}.code`),
    name: nullableText(raw.name, `${path}.name`),
    description: nullableText(raw.description, `${path}.description`),
    latitude: nullableNumeric(raw.latitude, `${path}.latitude`),
    longitude: nullableNumeric(raw.longitude, `${path}.longitude`),
    zoneId: nullableText(raw.zoneId, `${path}.zoneId`),
    url: nullableText(raw.url, `${path}.url`),
    locationType: numeric(raw.locationType, `${path}.locationType`),
    parentId: nullableText(raw.parentId, `${path}.parentId`),
    timezone: nullableText(raw.timezone, `${path}.timezone`),
    wheelchairBoarding: nullableNumeric(
      raw.wheelchairBoarding,
      `${path}.wheelchairBoarding`,
    ),
    levelId: nullableText(raw.levelId, `${path}.levelId`),
    platformCode: nullableText(raw.platformCode, `${path}.platformCode`),
  };
}

export function parseRoutePage(value: unknown, path = "routes") {
  return parseCatalogPage(value, path, parseRoute);
}

export function parseStopPage(value: unknown, path = "stops") {
  return parseCatalogPage(value, path, parseStop);
}

function parseDeparture(value: unknown, path: string): Departure {
  const raw = object(value, path);
  return {
    tripId: text(raw.tripId, `${path}.tripId`),
    routeId: text(raw.routeId, `${path}.routeId`),
    stopId: text(raw.stopId, `${path}.stopId`),
    stopSequence: numeric(raw.stopSequence, `${path}.stopSequence`),
    serviceDate: text(raw.serviceDate, `${path}.serviceDate`),
    headsign: nullableText(raw.headsign, `${path}.headsign`),
    arrivalTime: nullableText(raw.arrivalTime, `${path}.arrivalTime`),
    departureTime: nullableText(raw.departureTime, `${path}.departureTime`),
    scheduledArrival: nullableText(raw.scheduledArrival, `${path}.scheduledArrival`),
    scheduledDeparture: nullableText(raw.scheduledDeparture, `${path}.scheduledDeparture`),
    pickupType: nullableNumeric(raw.pickupType, `${path}.pickupType`),
    timepoint: nullableNumeric(raw.timepoint, `${path}.timepoint`),
  };
}

export function parseDeparturePage(
  value: unknown,
  path = "departures",
): DeparturePage {
  const raw = object(value, path);
  return {
    scheduleVersion: parseScheduleVersion(
      raw.scheduleVersion,
      `${path}.scheduleVersion`,
    ),
    provenance: enumText(raw.provenance, `${path}.provenance`),
    data: list(raw.data, `${path}.data`, parseDeparture),
    nextAfter: nullableText(raw.nextAfter, `${path}.nextAfter`),
  };
}

/**
 * A coordinate pair. Order is **longitude, latitude**; a transposed pair would place MARC in
 * the Indian Ocean, so the structure is validated rather than assumed.
 */
function parseCoordinate(value: unknown, path: string): Position {
  const pair = list(value, path, numeric);
  if (pair.length < 2) {
    throw new BackendError({
      kind: "contract",
      path,
      detail: `expected a coordinate pair, received ${pair.length} values`,
    });
  }
  return [pair[0], pair[1]];
}

function parseLineString(value: unknown, path: string): LineStringGeometry {
  const raw = object(value, path);
  const type = text(raw.type, `${path}.type`);
  if (type !== "LineString") {
    throw new BackendError({
      kind: "contract",
      path: `${path}.type`,
      detail: `expected a LineString, received ${type}`,
    });
  }
  const coordinates = list(raw.coordinates, `${path}.coordinates`, parseCoordinate);
  // A line needs two points. One point is not a route, and drawing it would invent a
  // segment that the feed does not contain.
  if (coordinates.length < 2) {
    throw new BackendError({
      kind: "contract",
      path: `${path}.coordinates`,
      detail: `expected at least two positions, received ${coordinates.length}`,
    });
  }
  return { type: "LineString", coordinates };
}

function parseShape(value: unknown, path: string): Shape {
  const raw = object(value, path);
  return {
    shapeId: text(raw.shapeId, `${path}.shapeId`),
    lengthMeters: numeric(raw.lengthMeters, `${path}.lengthMeters`),
    pointCount: numeric(raw.pointCount, `${path}.pointCount`),
    geometry: parseLineString(raw.geometry, `${path}.geometry`),
  };
}

export function parseShapePage(value: unknown, path = "shapes"): ShapePage {
  const raw = object(value, path);
  return {
    scheduleVersion: parseScheduleVersion(
      raw.scheduleVersion,
      `${path}.scheduleVersion`,
    ),
    provenance: enumText(raw.provenance, `${path}.provenance`),
    data: list(raw.data, `${path}.data`, parseShape),
    nextAfter: nullableText(raw.nextAfter, `${path}.nextAfter`),
  };
}
