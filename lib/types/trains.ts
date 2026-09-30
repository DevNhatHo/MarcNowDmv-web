/**
 * Train list, detail and calculated-movement wire contract.
 *
 * Provenance groups stay separate exactly as the backend sends them: `scheduled` is
 * SCHEDULED, `official` and `position` are OFFICIAL_REALTIME, and `calculated` is
 * CALCULATED and a sibling of `data`, not a field inside it. Nothing here merges a
 * schedule with an estimate or promotes retained evidence to a current claim.
 */
import type {
  Enum,
  Freshness,
  Provenance,
  ScheduleVersion,
  SourceHealth,
} from "./common";

/** Top-level current claim. A retained `official.status` can disagree with it. */
export const trainStatuses = [
  "ON_TIME",
  "EARLY",
  "DELAYED",
  "CANCELED",
  "DELETED",
  "STALE",
  "UNKNOWN",
] as const;
export type TrainStatus = Enum<(typeof trainStatuses)[number]>;

/** Evidence provenance common to `official` and `position`. */
export interface Evidence {
  source: string;
  observationId: string | null;
  sourceTimestamp: string | null;
  receivedAt: string | null;
  freshness: Freshness;
  conflict: boolean;
  provenance: Provenance;
}

export interface ScheduledTrain {
  provenance: Provenance;
  start: string;
  /** Absent for a schedule that declares no end. */
  end: string | null;
}

/** `delaySeconds` null means no official delay was published; zero means on time. */
export interface OfficialTrain extends Evidence {
  status: TrainStatus;
  delaySeconds: number | null;
  /** GTFS-RT numeric trip schedule relationship, not a string. */
  scheduleRelationship: number | null;
}

export interface TrainPosition extends Evidence {
  latitude: number | null;
  longitude: number | null;
  speedMetersPerSecond: number | null;
  bearingDegrees: number | null;
  vehicleId: string | null;
}

/**
 * One train for one service date. The backend exposes no train number, headsign or
 * direction; `tripId` is the only verbatim fallback and must never be parsed to invent
 * one. List rows carry no calculated movement.
 */
export interface Train {
  id: string;
  scheduleVersion: string;
  tripId: string;
  routeId: string;
  serviceDate: string;
  status: TrainStatus;
  scheduled: ScheduledTrain;
  official: OfficialTrain;
  position: TrainPosition;
}

/**
 * A page of the whole scheduled service date, including completed and schedule-only
 * trains. This is not an active-train list, and a page is never a complete total.
 */
export interface TrainListPage {
  evaluatedAt: string;
  scheduleVersion: ScheduleVersion;
  serviceDate: string;
  sourceHealth: SourceHealth[];
  data: Train[];
  nextAfter: string | null;
}

export interface ScheduledStop {
  sequence: number;
  stopId: string;
  scheduledArrival: string | null;
  scheduledDeparture: string | null;
}

/**
 * One official stop update. `resolvedSequence` and `stopId` are null when the update
 * could not be matched to a scheduled call, so an unresolved update must not be drawn
 * on the schedule timeline.
 */
export interface OfficialStopUpdate {
  ordinal: number;
  resolvedSequence: number | null;
  stopId: string | null;
  scheduleRelationship: number | null;
  officialEstimatedArrival: string | null;
  officialEstimatedDeparture: string | null;
  officialArrivalDelaySeconds: number | null;
  officialDepartureDelaySeconds: number | null;
  resolution: Enum<
    "resolved" | "no_matching_stop" | "unsupported_relationship" | "unresolved"
  >;
}

/** Every calculated object carries its own state and reasons and is read independently. */
interface Calculation {
  provenance: Provenance;
  state: string;
  reasons: string[];
}

export const movementStates = ["MOVING", "STATIONARY", "UNKNOWN"] as const;
export type MovementState = Enum<(typeof movementStates)[number]>;

/**
 * Observed movement. `stationarySeconds` can survive into an UNKNOWN state as a historic
 * value: it is what was once observed, never a duration to extend with wall-clock time.
 */
export interface ObservedMovement extends Calculation {
  state: MovementState;
  observedStart: string | null;
  observedEnd: string | null;
  stationarySeconds: number | null;
  maxDisplacementMeters: number | null;
  observationIds: string[];
  radiusMeters: number;
  minStationarySeconds: number;
  maxGapSeconds: number;
  rejectedCount: number;
}

export const progressStates = [
  "MEASURED",
  "AMBIGUOUS",
  "OFF_ROUTE",
  "UNKNOWN",
] as const;
export type ProgressState = Enum<(typeof progressStates)[number]>;

/** One candidate stretch of shape. Ambiguity keeps every candidate and snaps nothing. */
export interface ProgressCandidate {
  shapeSequence: number;
  alongRouteMeters: number;
  offRouteMeters: number;
  /** GTFS `shape_dist_traveled`, whose unit the feed does not define. */
  sourceShapeDistance: number | null;
}

/** Route progress is a measurement along a shape, not route geometry to draw. */
export interface RouteProgress extends Calculation {
  state: ProgressState;
  shapeId: string | null;
  shapeLengthMeters: number | null;
  alongRouteMeters: number | null;
  fractionAlong: number | null;
  offRouteMeters: number | null;
  candidates: ProgressCandidate[];
  nearest: ProgressCandidate | null;
  corridorMeters: number;
  separationMeters: number;
  /** "unknown" for `shape_dist_traveled`, which must never be read as metres. */
  sourceDistanceUnits: Enum<"unknown" | "meters">;
}

export const nextStopStates = ["IDENTIFIED", "PASSED_FINAL", "UNKNOWN"] as const;
export type NextStopState = Enum<(typeof nextStopStates)[number]>;

/** Calculated next stop. Distinct from the envelope's `nextStop` pagination cursor. */
export interface CalculatedNextStop extends Calculation {
  state: NextStopState;
  stopSequence: number | null;
  stopId: string | null;
  alongRouteDistanceMeters: number | null;
  units: Enum<"meters" | "unknown">;
  /** True when the official feed reported this scheduled candidate skipped. */
  officiallySkipped: boolean | null;
}

export const trendStates = [
  "IMPROVING",
  "STABLE",
  "WORSENING",
  "UNKNOWN",
] as const;
export type TrendState = Enum<(typeof trendStates)[number]>;
export const trendLevels = ["TRIP", "STOP"] as const;
export type TrendLevel = Enum<(typeof trendLevels)[number]>;
export const trendEvents = ["ARRIVAL", "DEPARTURE"] as const;
export type TrendEvent = Enum<(typeof trendEvents)[number]>;

/** A trend over official delay evidence, evaluated independently of GPS freshness. */
export interface OfficialDelayTrend extends Calculation {
  state: TrendState;
  level: TrendLevel;
  stopSequence: number | null;
  event: TrendEvent | null;
  changeSeconds: number | null;
  officialDelaySeconds: number | null;
  observationIds: string[];
  windowSeconds: number;
  toleranceSeconds: number;
  excludedCount: number;
}

export interface Calculated {
  evaluatedAt: string;
  observedMovement: ObservedMovement;
  routeProgress: RouteProgress;
  nextStop: CalculatedNextStop;
  officialDelayTrend: OfficialDelayTrend;
}

/**
 * Train detail. `nextStop` and `nextUpdate` are pagination cursors for `scheduledStops`
 * and `officialStopUpdates`; commuter next-stop information is `calculated.nextStop`.
 */
export interface TrainDetail {
  evaluatedAt: string;
  data: Train;
  sourceHealth: SourceHealth[];
  scheduledStops: ScheduledStop[];
  officialStopUpdates: OfficialStopUpdate[];
  nextStop: number | null;
  nextUpdate: number | null;
  calculated: Calculated | null;
}
