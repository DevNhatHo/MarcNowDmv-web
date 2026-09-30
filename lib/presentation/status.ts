/**
 * Status vocabulary.
 *
 * Every label here is a statement about *evidence*, not about a train. A value the backend
 * did not publish, or one this frontend has never seen, becomes an explicit unavailable
 * label — never a positive claim, never a guess, and never the healthy treatment.
 */
import { isKnown } from "../types/common";
import type { Freshness } from "../types/common";
import { trainStatuses, type TrainStatus } from "../types/trains";

/** Presentation tone. It selects wording and a text colour, never a filled surface. */
export type Tone = "positive" | "information" | "warning" | "critical" | "unknown";

export interface StatusLabel {
  text: string;
  tone: Tone;
}

const statusLabels: Record<(typeof trainStatuses)[number], StatusLabel> = {
  ON_TIME: { text: "On time", tone: "positive" },
  EARLY: { text: "Running early", tone: "information" },
  DELAYED: { text: "Delayed", tone: "information" },
  CANCELED: { text: "Cancelled", tone: "critical" },
  DELETED: { text: "Removed from the schedule", tone: "critical" },
  STALE: { text: "Realtime status out of date", tone: "unknown" },
  UNKNOWN: { text: "Realtime status unavailable", tone: "unknown" },
};

/**
 * The top-level status is the only current claim. An unrecognized value is reported as
 * unavailable rather than rendered raw, so a future backend state cannot read as healthy.
 */
export function trainStatusLabel(status: TrainStatus): StatusLabel {
  return isKnown(trainStatuses, status)
    ? statusLabels[status]
    : { text: "Realtime status unavailable", tone: "unknown" };
}

/**
 * GTFS-RT numeric schedule relationships. Only documented values get a label; anything
 * else is unavailable, because guessing a meaning from a number would invent official
 * information. Trip-level 3 (REPLACEMENT) and 5 (DUPLICATED) are deprecated upstream but
 * can still appear, so they are named rather than silently dropped.
 */
const tripRelationships: Record<number, string> = {
  0: "Scheduled",
  1: "Added to the schedule",
  2: "Not operating",
  3: "Replacement service",
  5: "Duplicated trip",
  6: "Deleted",
};

const stopRelationships: Record<number, string> = {
  0: "Scheduled",
  1: "Reported skipped",
  2: "No data reported",
  3: "Not scheduled to stop",
};

export function tripRelationshipLabel(value: number | null): string | null {
  if (value === null) return null;
  return tripRelationships[value] ?? "Reported status unavailable";
}

export function stopRelationshipLabel(value: number | null): string | null {
  if (value === null) return null;
  return stopRelationships[value] ?? "Reported status unavailable";
}

/** True only for the one relationship that means the operator reported a skipped call. */
export function isReportedSkipped(value: number | null): boolean {
  return value === 1;
}

const freshnessLabels: Record<string, StatusLabel> = {
  FRESH: { text: "Current", tone: "positive" },
  STALE: { text: "Out of date", tone: "warning" },
  UNKNOWN: { text: "Unavailable", tone: "unknown" },
  UNAVAILABLE: { text: "Unavailable", tone: "unknown" },
};

export function freshnessLabel(freshness: Freshness): StatusLabel {
  return freshnessLabels[freshness] ?? { text: "Unavailable", tone: "unknown" };
}

/**
 * Official delay wording. A null delay is not zero: the operator published no delay, which
 * is different from publishing "no delay". Both are stated, differently.
 */
export function delayLabel(delaySeconds: number | null): string {
  if (delaySeconds === null) return "No delay reported";
  if (delaySeconds === 0) return "No delay";
  const total = Math.abs(delaySeconds);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const size =
    minutes === 0
      ? `${seconds} sec`
      : seconds === 0
        ? `${minutes} min`
        : `${minutes} min ${seconds} sec`;
  return delaySeconds > 0 ? `${size} late` : `${size} early`;
}

/**
 * Position wording. A stale or unavailable coordinate is described as last reported and
 * never as where the train is; a missing coordinate says so plainly.
 */
export function positionLabel(
  latitude: number | null,
  longitude: number | null,
  freshness: Freshness,
): StatusLabel {
  if (latitude === null || longitude === null) {
    return { text: "Position unavailable", tone: "unknown" };
  }
  if (freshness === "FRESH") {
    return { text: "Reported location", tone: "information" };
  }
  return { text: "Last reported location", tone: "warning" };
}

/** Coordinates are the honest interim fallback; no place name is ever inferred from them. */
export function coordinatesText(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
