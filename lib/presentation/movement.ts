/**
 * Calculated movement vocabulary.
 *
 * Every label in this file describes a MARC Now calculation, never an official statement.
 * Each calculated object is read independently, exactly as the backend evaluates them: a
 * stale GPS position cannot erase a delay trend built from official Trip Updates, and a
 * movement calculation is never evidence about whether a train is on time.
 *
 * Nothing here computes movement, distance or a trend. The backend already did; this only
 * chooses words for what it reported.
 */
import { isKnown } from "../types/common";
import type {
  CalculatedNextStop,
  MovementState,
  NextStopState,
  ObservedMovement,
  OfficialDelayTrend,
  TrendState,
} from "../types/trains";
import { movementStates, nextStopStates, trendStates } from "../types/trains";
import type { StatusLabel } from "./status";

/** Prefix that marks a value as this service's calculation rather than the operator's. */
export const calculatedSource = "MARC Now";

const movementLabels: Record<(typeof movementStates)[number], StatusLabel> = {
  // Moving says nothing about punctuality, so the wording stays purely physical.
  MOVING: { text: "Moving", tone: "information" },
  // Stationary is an observation, never a cause and never an official disruption.
  STATIONARY: { text: "Appears stationary", tone: "warning" },
  UNKNOWN: { text: "Movement unavailable", tone: "unknown" },
};

export function movementLabel(state: MovementState): StatusLabel {
  return isKnown(movementStates, state)
    ? movementLabels[state]
    : { text: "Movement unavailable", tone: "unknown" };
}

/**
 * The dwell to display, in seconds, or null.
 *
 * A duration is shown **only** while the calculation is STATIONARY. An UNKNOWN movement can
 * still carry the `stationarySeconds` it once observed; presenting that as a current dwell
 * would claim the train is still stopped when tracking has actually been lost.
 */
export function displayableStationarySeconds(
  movement: ObservedMovement,
): number | null {
  if (movement.state !== "STATIONARY") return null;
  return movement.stationarySeconds;
}

/** A coarse duration. The backend measured it; this only words it. */
export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} sec`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

const nextStopLabels: Record<(typeof nextStopStates)[number], StatusLabel> = {
  IDENTIFIED: { text: "Next scheduled stop", tone: "information" },
  // The train is beyond its last scheduled call; no replacement is invented.
  PASSED_FINAL: { text: "Passed its final scheduled stop", tone: "unknown" },
  UNKNOWN: { text: "Next stop unavailable", tone: "unknown" },
};

export function nextStopLabel(state: NextStopState): StatusLabel {
  return isKnown(nextStopStates, state)
    ? nextStopLabels[state]
    : { text: "Next stop unavailable", tone: "unknown" };
}

/**
 * The distance to the next stop, worded only when the backend said it is in metres.
 *
 * `units` exists because GTFS does not define the unit of a source shape distance. If the
 * backend ever reports something else, the number is withheld rather than relabelled.
 */
export function distanceLabel(call: CalculatedNextStop): string | null {
  const meters = call.alongRouteDistanceMeters;
  if (meters === null) return null;
  if (call.units !== "meters") return null;
  if (meters < 1000) return `${Math.round(meters)} m away along the route`;
  return `${(meters / 1000).toFixed(1)} km away along the route`;
}

const trendLabels: Record<(typeof trendStates)[number], StatusLabel> = {
  IMPROVING: { text: "Official delay improving", tone: "positive" },
  STABLE: { text: "Official delay steady", tone: "information" },
  WORSENING: { text: "Official delay worsening", tone: "warning" },
  UNKNOWN: { text: "Delay trend unavailable", tone: "unknown" },
};

export function trendLabel(state: TrendState): StatusLabel {
  return isKnown(trendStates, state)
    ? trendLabels[state]
    : { text: "Delay trend unavailable", tone: "unknown" };
}

/**
 * The size of the change the trend measured, worded as a direction rather than a signed
 * number. A change of zero seconds is not rendered, because "changed by 0" is noise.
 */
export function trendChangeLabel(trend: OfficialDelayTrend): string | null {
  const change = trend.changeSeconds;
  if (change === null || change === 0) return null;
  const size = durationLabel(Math.abs(change));
  return change > 0 ? `${size} worse over the window` : `${size} better over the window`;
}

/** Which official delay series the trend was measured over, for the diagnostics list. */
export function trendScopeLabel(trend: OfficialDelayTrend): string {
  if (trend.level === "TRIP") return "across the whole trip";
  if (trend.level === "STOP") {
    const event = trend.event === "ARRIVAL" ? "arrival" : "departure";
    return trend.stopSequence === null
      ? `at one stop's ${event}`
      : `at stop ${trend.stopSequence}'s ${event}`;
  }
  return "over an unrecognised series";
}
